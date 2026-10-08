"""Generate the shared 30 Hz, 12 s Panda joint-space sweep (Python stdlib, CPU)."""
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'public/models/panda/panda.json').read_text())
limits = {link['joint']['index']:link['joint']['limits'] for link in manifest['links']
          if link['joint'] and link['joint']['type'] == 'revolute'}
frames = []
for i in range(361):
    t = i / 30
    a = 2 * math.pi * t / 12
    q = [.5*math.sin(a), -.4+.2*math.sin(a), .15*math.sin(a),
         -2+.22*math.sin(a+.4), .18*math.sin(a), 1.6+.15*math.sin(a+.4),
         math.pi/4+.2*math.sin(a)]
    assert all(limits[j][0] <= value <= limits[j][1] for j, value in enumerate(q))
    frames.append({'t':round(t,6), 'q':[round(value,8) for value in q]})
trajectory = {'name':'Franka Panda — free-space sweep', 'robot':'franka-panda',
              'units':'radians', 'duration':12, 'sampleRate':30, 'frames':frames}
(ROOT / 'public/robot-demos/sample-trajectory.json').write_text(
    json.dumps(trajectory, separators=(',',':'))+'\n')
print(f'Wrote {len(frames)} seven-joint samples within Panda limits.')
