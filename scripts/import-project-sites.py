#!/usr/bin/env python3
"""Import website-only snapshots. Usage: import-project-sites.py BRACE_REPO DJEPA_REPO MIMICX_REPO"""
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITES = [
    ('brace', 'BRACE', ['index.html', 'static', 'animation', 'THIRD_PARTY_NOTICES.md']),
    ('d-jepa', 'D-JEPA', ['index.html', 'explainer.html', 'site-content.json', 'static']),
    ('mimicx', 'MimicX', ['index.html', 'assets', 'REPRODUCIBILITY.md', 'HLOOP.md']),
]
if len(sys.argv) != 4:
    raise SystemExit(__doc__)

for (slug, name, includes), argument in zip(SITES, sys.argv[1:]):
    source = Path(argument).resolve()
    docs = source / 'docs'
    if not (docs / 'index.html').is_file():
        raise SystemExit(f'{name}: missing docs/index.html')
    destination = ROOT / 'public' / 'examples' / slug
    selected = set()
    for include in includes:
        entry = docs / include
        if entry.is_dir():
            selected.update(p for p in entry.rglob('*') if p.is_file())
        else:
            selected.add(entry)
    # The attributed D-JEPA site links to arXiv; do not copy manuscript drafts.
    selected = {p for p in selected if p.is_file() and not (slug == 'd-jepa' and p.is_relative_to(docs / 'static' / 'paper'))}
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    files = []
    for file in sorted(selected):
        relative = file.relative_to(docs)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, target)
        with file.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        if target.suffix == '.html':
            depth = len(relative.parts) - 1
            prefix = '../' * (2 + depth)
            html = target.read_text()
            html = html.replace('</head>', f'<link rel="stylesheet" href="{prefix}collection-navigation.css">\n</head>')
            html = html.replace('</body>', f'<a class="collection-back-link" href="{prefix}" target="_top" aria-label="返回集锦"><span aria-hidden="true">←</span> 返回集锦</a>\n</body>')
            target.write_text(html)
        files.append({'path': str(relative), 'sha256': digest, 'bytes': file.stat().st_size})
    shutil.copy2(source / 'LICENSE', destination / 'SOURCE-LICENSE.txt')
    if (source / 'NOTICE').is_file():
        shutil.copy2(source / 'NOTICE', destination / 'SOURCE-NOTICE.txt')
    metadata = {
        'name': name,
        'repository': f'https://github.com/NEBULIS-Lab/{name}',
        'sourceDirectory': 'docs/',
        'sourceCommit': subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip(),
        'sourceDocsHaveLocalChanges': bool(subprocess.check_output(['git', '-C', str(source), 'status', '--porcelain', '--', 'docs'], text=True).strip()),
        'importedAt': datetime.now(timezone.utc).isoformat(),
        'changes': ['Added collection return navigation to HTML pages; source files remain unchanged.'],
        'excluded': ['training code', 'checkpoints', 'datasets', 'local infrastructure notes'] + (['static/paper/ (manuscript drafts)'] if slug == 'd-jepa' else []),
        'files': files,
    }
    (destination / 'snapshot.json').write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + '\n')
    print(f'{name}: {len(files)} files, {sum(f["bytes"] for f in files) / 1e6:.1f} MB')
