"""Check archive URL rewriting without third-party archives or network access."""
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('reference_library', Path(__file__).parents[1] / 'scripts/serve-reference-library.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ArchivePreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'metadata').mkdir()
        (self.root / 'external').mkdir()
        (self.root / 'repos/personal/warp-rm').mkdir(parents=True)
        (self.root / 'repos/personal/recordings').mkdir()
        (self.root / 'external/jquery.js').write_text('window.jQuery = {};')
        (self.root / 'external/font.woff2').write_bytes(b'font')
        (self.root / 'metadata/external-assets.json').write_text(json.dumps([{'url': 'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js', 'path': 'external/jquery.js', 'status': 'downloaded-alternative-host'}, {'url':'https://uynitsuj.github.io/font.woff2','path':'external/font.woff2','status':'recovered-from-versioned-upstream'}]))
        (self.root / 'repos/personal/recordings/test.viser').write_bytes(b'0123456789')
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), module.make_handler(self.root))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_port}'

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        self.temp.cleanup()

    def test_js_syntax_fragments_survive_and_recording_paths_are_local(self):
        original = '''const x = {"clip-path":"url(#".concat(id,")")}; const re=/"/g; const path="/recordings/test.viser";'''
        (self.root / 'repos/personal/warp-rm/client.js').write_text(original)
        with urlopen(self.base + '/sites/warp-rm/client.js') as response:
            served = response.read().decode()
        self.assertEqual(served, original.replace('"/recordings/test.viser"', '"/sites/justin-yu/recordings/test.viser"'))

    def test_alternate_cdn_cache_and_video_range(self):
        (self.root / 'repos/personal/warp-rm/index.html').write_text('<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>')
        with urlopen(self.base + '/sites/warp-rm/') as response:
            self.assertIn('/__external/jquery.js', response.read().decode())
        request = Request(self.base + '/sites/justin-yu/recordings/test.viser', headers={'Range':'bytes=3-5'})
        with urlopen(request) as response:
            self.assertEqual(response.status, 206)
            self.assertEqual(response.headers['Content-Range'], 'bytes 3-5/10')
            self.assertEqual(response.read(), b'345')

    def test_recovered_fonts_are_mapped_from_relative_css_urls(self):
        (self.root / 'repos/personal/warp-rm/style.css').write_text('@font-face {src:url(../font.woff2)}')
        with urlopen(self.base + '/sites/warp-rm/style.css') as response:
            self.assertIn('url(/__external/font.woff2)', response.read().decode())

    def test_parent_paths_cannot_escape_archive(self):
        with self.assertRaises(HTTPError) as caught:
            urlopen(self.base + '/sites/warp-rm/../../../../metadata/external-assets.json')
        self.assertEqual(caught.exception.code, 404)

if __name__ == '__main__':
    unittest.main()
