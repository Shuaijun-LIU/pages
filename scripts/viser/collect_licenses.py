"""Collect original npm LICENSE/NOTICE files for the upstream locked dependency set.

Deliberately includes build dependencies too, so the notice collection is a superset.
Tarballs are read in memory, never installed or executed. Run from any directory.
"""
import concurrent.futures
import io
import json
from pathlib import Path
import re
import tarfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/examples/viser-replay/viewer'
lock=json.loads((OUT/'upstream-package-lock.json').read_text())
packages={}
for path,meta in lock['packages'].items():
    if path and meta.get('resolved','').startswith('https://registry.npmjs.org/'):
        packages[(path.split('node_modules/')[-1],meta['version'])]=meta

def collect(entry):
    (name,version),meta=entry
    for retry in range(3):
        try:
            with urllib.request.urlopen(meta['resolved'],timeout=35) as response:
                data=response.read()
            texts=[]
            with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
                for file in archive.getmembers():
                    if file.isfile() and re.search(r'(^|/)(LICEN[CS]E|NOTICE|COPYING)([.\-_]|$)',file.name,re.I) and file.size<250000:
                        texts.append((file.name,archive.extractfile(file).read().decode('utf-8',errors='replace')))
            return (name,version,meta.get('license','not declared'),meta['resolved'],texts)
        except Exception as e:
            if retry==2: raise RuntimeError(f'{name}@{version}: {e}')
            time.sleep(1)

results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    for result in pool.map(collect,sorted(packages.items())):
        results.append(result)
        print(result[0],result[1],len(result[-1]),flush=True)
lines=['# Upstream npm dependency license texts', '', 'Original LICENSE / NOTICE / COPYING files from the exact npm tarballs referenced by the Viser 1.1.1 client lockfile. Includes build dependencies as a conservative superset.', '']
for name,version,license,url,texts in results:
    lines.extend([f'## {name} {version}',f'Declared license: {license}',f'Source: {url}',''])
    if not texts: lines.extend(['No separate LICENSE, NOTICE, or COPYING file was included in this npm distribution. Consult the package source and declared license.',''])
    for file,text in texts: lines.extend([f'### {file}','```text',text.rstrip(),'```',''])
(OUT/'DEPENDENCY_LICENSES.md').write_text('\n'.join(lines))
print(f'Collected {len(results)} distributions',flush=True)
