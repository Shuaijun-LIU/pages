"""Convert pinned Menagerie Panda visual meshes to per-link GLB (CPU only).

Requires numpy + trimesh; downloads upstream OBJ sources to a caller-selected cache.
Example: python scripts/build-panda-assets.py --cache /tmp/panda-source
"""
from pathlib import Path
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import urllib.request
import xml.etree.ElementTree as ET
import numpy as np
import trimesh

COMMIT = '0059d4335f8156206f63a35662313385f7ad6d74'
BASE = f'https://raw.githubusercontent.com/google-deepmind/mujoco_menagerie/{COMMIT}/franka_emika_panda/'
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
args = parser.parse_args()
args.cache.mkdir(parents=True, exist_ok=True)
out = ROOT / 'public/models/panda'
(out / 'links').mkdir(parents=True, exist_ok=True)

def download(name):
    dest = args.cache / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        req = urllib.request.Request(BASE + name, headers={'User-Agent': 'Panda-asset-builder'})
        with urllib.request.urlopen(req, timeout=90) as response:
            dest.write_bytes(response.read())
    return dest

xml = download('panda.xml')
source = ET.parse(xml).getroot()
meshes = {m.get('name', Path(m.attrib['file']).stem):m.attrib['file'] for m in source.findall('asset/mesh')}
materials = {m.attrib['name']:[float(x) for x in m.attrib['rgba'].split()] for m in source.findall('asset/material')}
files = sorted({meshes[g.attrib['mesh']] for g in source.findall('.//geom') if g.get('class') == 'visual' and 'mesh' in g.attrib})
with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(download, ['assets/' + f for f in files]))
(out / 'LICENSE').write_bytes(download('LICENSE').read_bytes())
(out / 'panda.xml').write_bytes(xml.read_bytes())
links = []
stats = []

def vec(text): return [float(v) for v in text.split()]
def build(body, parent):
    name = body.attrib['name']
    scene = trimesh.Scene()
    count = 0
    for geom in body.findall('geom'):
        if geom.get('class') != 'visual': continue
        meshname = geom.attrib['mesh']
        mesh = trimesh.load(args.cache / 'assets' / meshes[meshname], force='mesh', process=False)
        rgba = np.array(materials[geom.attrib['material']])
        mesh.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
            name=geom.attrib['material'], baseColorFactor=np.round(rgba*255).astype(np.uint8), metallicFactor=.06, roughnessFactor=.38))
        scene.add_geometry(mesh, node_name=meshname, geom_name=meshname)
        count += len(mesh.faces)
    glb = scene.export(file_type='glb')
    (out / 'links' / f'{name}.glb').write_bytes(glb)
    quat = np.array(vec(body.get('quat', '1 0 0 0'))); quat /= np.linalg.norm(quat)
    joint = body.find('joint')
    joint_data = None
    if joint is not None:
        finger = joint.get('class') == 'finger'
        joint_data = {'name':joint.attrib['name'], 'type':'prismatic' if finger else 'revolute',
            'axis':[0,1,0] if finger else [0,0,1],
            'limits':vec(joint.get('range', '0 0.04' if finger else '-2.8973 2.8973'))}
        if not finger: joint_data['index'] = int(joint.attrib['name'][5:])-1
    links.append({'name':name,'parent':parent,'position':vec(body.get('pos','0 0 0')),
                  'quaternion':quat.tolist(),'mesh':f'links/{name}.glb','joint':joint_data})
    stats.append({'name':name,'triangles':count,'bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest()})
    for child in body.findall('body'): build(child, name)
build(source.find('worldbody/body'), None)
manifest = {'name':'Franka Emika Panda', 'units':'metres','upAxis':'Z','links':links,
    'tcp':{'parent':'hand','position':[0,0,.1034]},'home':[0,-.4,0,-2,0,1.6,.7853981634],'fingerPosition':.025}
(out / 'panda.json').write_text(json.dumps(manifest,indent=2)+'\n')
provenance = {'robot':'Franka Emika Panda','source':'https://github.com/google-deepmind/mujoco_menagerie/tree/'+COMMIT+'/franka_emika_panda',
    'commit':COMMIT,'license':'Apache-2.0','upstream_description':'Franka Emika franka_ros visual meshes converted by MuJoCo Menagerie',
    'conversion':'Original OBJ visual geometry preserved without decimation; authored MJCF material colors assigned to per-link GLB, in original metre/Z-up link frames. Collision geometries omitted. Transforms and joint limits from panda.xml. TCP at hand-local (0,0,0.1034).',
    'generator':'scripts/build-panda-assets.py','links':stats,'sourceFiles':[{'file':f,'sha256':hashlib.sha256((args.cache/'assets'/f).read_bytes()).hexdigest()} for f in files]}
(out / 'source.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(json.dumps({'links':len(links),'triangles':sum(s['triangles'] for s in stats),'glbBytes':sum(s['bytes'] for s in stats)},indent=2))
