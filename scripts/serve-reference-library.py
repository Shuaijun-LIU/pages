#!/usr/bin/env python3
"""Read-only local preview of archived project websites, with cached CDN assets."""
import argparse
import html
import json
import mimetypes
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

SITES = {
    'justin-yu': ('personal', '', 'https://uynitsuj.github.io/'),
    'warp-rm': ('personal', 'warp-rm', 'https://uynitsuj.github.io/warp-rm/'),
    'egomi': ('egomi', '', 'https://egocentric-manipulation-interface.github.io/'),
    'real2render2real': ('r2r2r', '', 'https://real2render2real.com/'),
    'pogs': ('pogs', '', 'https://berkeleyautomation.github.io/POGS/'),
    'legs': ('legs', '', 'https://berkeleyautomation.github.io/LEGS/'),
    'cap-x': ('cap-x', '', 'https://capgym.github.io/'),
    'sarm': ('sarm', '', 'https://qianzhong-chen.github.io/sarm.github.io/'),
    'sarm2': ('sarm2', '', 'https://qianzhong-chen.github.io/sarm2.github.io/'),
}

def make_handler(library):
    cache_file = library / 'metadata/external-assets.json'
    cached = json.loads(cache_file.read_text()) if cache_file.exists() else []
    substitutions = {row['url']: '/__external/' + row['path'].removeprefix('external/')
                     for row in cached if row.get('path') and (library / row['path']).is_file()}
    for slug, (_, _, url) in SITES.items():
        substitutions[url] = f'/sites/{slug}/'
        substitutions[url.replace('https://', 'http://')] = f'/sites/{slug}/'
    substitutions['https://www.real2render2real.com/'] = '/sites/real2render2real/'

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, fmt, *args):
            if args and str(args[1] if len(args) > 1 else '').startswith('4'):
                super().log_message(fmt, *args)

        def rewrite(self, text, source_url, slug):
            # Relative font references in mirrored CSS need the original CSS URL.
            def css_url(match):
                raw = match[1].strip(' \"\'')
                absolute = urljoin(source_url, raw)
                return 'url(' + substitutions[absolute] + ')' if absolute in substitutions else match[0]
            if source_url.endswith('.css') or 'fonts.googleapis.com' in source_url:
                text = re.sub(r'url\(([^)]+)\)', css_url, text)
            for original, local in sorted(substitutions.items(), key=lambda p: -len(p[0])):
                text = text.replace(original, local).replace(original.replace('&', '&amp;'), local)
            if slug:
                # All root-relative references belong to the upstream domain, not this launcher.
                def root_url(match):
                    quote, path = match.groups()
                    if path.startswith(('/sites/', '/__external/', '//')):
                        return quote + path
                    absolute = urljoin(source_url, path)
                    for original, local in sorted(substitutions.items(), key=lambda p: -len(p[0])):
                        if absolute.startswith(original):
                            return quote + local + absolute[len(original):]
                    return quote + absolute
                text = re.sub(r'([\"\'])(/(?:recordings|css|js|images|assets|fonts|static|data|viser-client(?:-1\.0\.22)?|warp-rm)/[^\"\'\s<>]*)', root_url, text)
            return text

        def send_head(self):
            path = unquote(urlparse(self.path).path)
            if path == '/':
                links = ''.join(f'<li><a href="/sites/{slug}/">{html.escape(slug)}</a></li>' for slug in SITES)
                body = ('<!doctype html><meta charset="utf-8"><title>Local website archive</title>'
                        '<style>body{font:18px system-ui;max-width:760px;margin:60px auto;padding:24px}li{margin:16px 0}</style>'
                        '<h1>Local website archive</h1><p>Read-only previews of the archived authors’ pages. '
                        'See the source catalog before adapting or publishing.</p><ul>' + links + '</ul>').encode()
                return self.bytes_response(body, 'text/html; charset=utf-8')
            slug = None
            source_url = ''
            if path.startswith('/__external/'):
                file = (library / 'external' / path.removeprefix('/__external/')).resolve()
                root = (library / 'external').resolve()
                row = next((r for r in cached if r.get('path') == 'external/' + file.name), {})
                if path == '/__external/components/prism-python.min.js':
                    row = next((r for r in cached if r.get('url') == 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js'), {})
                    if row.get('path'):
                        file = (library / row['path']).resolve()
                source_url = row.get('url', '')
            elif path.startswith('/sites/'):
                parts = path.removeprefix('/sites/').split('/', 1)
                slug = parts[0]
                if slug not in SITES:
                    self.send_error(404); return None
                repo, subdir, url = SITES[slug]
                relative = parts[1] if len(parts) == 2 else ''
                if not relative or relative.endswith('/'):
                    relative += 'index.html'
                root = (library / 'repos' / repo / subdir).resolve()
                file = (root / relative).resolve()
                source_url = urljoin(url, relative)
                if slug == 'justin-yu' and relative in ('index.html', 'css/main.css'):
                    file = library / 'live' / ('personal.html' if relative == 'index.html' else 'personal-main.css')
                    root = (library / 'live').resolve()
            elif path == '/viser-idle-sway.js':
                root = (library / 'repos/personal').resolve()
                file = root / 'viser-idle-sway.js'
                source_url = 'https://uynitsuj.github.io/viser-idle-sway.js'
            else:
                self.send_error(404); return None
            if not file.resolve().is_relative_to(root) or not file.is_file():
                self.send_error(404, 'Asset not present in archive'); return None
            mime = mimetypes.guess_type(source_url or file.name)[0] or 'application/octet-stream'
            if 'fonts.googleapis.com' in source_url:
                mime = 'text/css'
            if mime in ('text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json'):
                return self.bytes_response(self.rewrite(file.read_text(errors='replace'), source_url, slug).encode(), mime + '; charset=utf-8')
            size = file.stat().st_size
            start, end = 0, size - 1
            range_header = self.headers.get('Range', '')
            match = re.fullmatch(r'bytes=(\d+)-(\d*)', range_header)
            if match:
                start = int(match[1]); end = min(int(match[2]), end) if match[2] else end
                if start > end:
                    self.send_error(416); return None
            self.send_response(206 if match else 200)
            self.send_header('Content-Type', mime)
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Length', str(end - start + 1))
            if match:
                self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.end_headers()
            stream = file.open('rb'); stream.seek(start)
            self.remaining = end - start + 1
            return stream

        def bytes_response(self, data, mime):
            import io
            self.send_response(200); self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data))); self.end_headers()
            self.remaining = len(data)
            return io.BytesIO(data)

        def copyfile(self, source, outputfile):
            try:
                while self.remaining > 0:
                    chunk = source.read(min(self.remaining, 64 * 1024))
                    if not chunk: break
                    outputfile.write(chunk); self.remaining -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass
    return Handler

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library', type=Path, default=Path('local-library/justin-yu'))
    parser.add_argument('--port', type=int, default=4190)
    args = parser.parse_args()
    library = args.library.resolve()
    if not (library / 'repos').is_dir():
        parser.error('Archive not found; pass --library pointing to the acquired source archive.')
    print(f'Local archive: http://127.0.0.1:{args.port}/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(library)).serve_forever()
