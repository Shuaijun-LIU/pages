"""Original CPU-generated arm choreography; export with Viser's native serializer.

Run from repository root. --serve keeps a real Python Viser server online.
No physics simulator, learned policy, external mesh, or external scene is used.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import time
from importlib.metadata import distribution

import numpy as np
import viser
import viser.transforms as tf

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/examples/viser-replay"
FRAMES, FPS = 240, 20


def tool_pose(t: float) -> np.ndarray:
    # Endpoint repeats smoothly; each waypoint is a tool-center position in metres.
    times = np.array([0, 1.5, 2.5, 4, 6, 7.5, 8.5, 10, 12])
    points = np.array([
        [.75, -.75, 1.03], [.75, -.75, .48], [.75, -.75, .48],
        [.75, -.75, 1.22], [.75, .75, 1.22], [.75, .75, .48],
        [.75, .75, .48], [.75, .75, 1.15], [.75, -.75, 1.03],
    ])
    i = min(np.searchsorted(times, t, side="right") - 1, len(times) - 2)
    u = np.clip((t-times[i]) / (times[i+1]-times[i]), 0, 1)
    u = u*u*(3-2*u)
    return points[i] * (1-u) + points[i+1] * u


def rotation_from_z(vector: np.ndarray) -> np.ndarray:
    z = vector / np.linalg.norm(vector)
    helper = np.array([0., 1., 0.]) if abs(z[1]) < .9 else np.array([1., 0., 0.])
    x = np.cross(helper, z); x /= np.linalg.norm(x)
    return tf.SO3.from_matrix(np.column_stack([x, np.cross(z, x), z])).wxyz


def make_scene(server: viser.ViserServer):
    scene = server.scene
    scene.set_up_direction("+z")
    scene.configure_environment_map(None)
    scene.configure_default_lights(enabled=True, cast_shadow=False)
    scene.add_light_ambient("/illumination", intensity=.7)
    scene.add_grid("/workspace/grid", width=5, height=4, cell_size=.25,
                   section_size=1, cell_color=(211, 218, 207),
                   section_color=(183, 194, 178), plane_color=(238, 241, 234),
                   plane_opacity=1, shadow_opacity=0, position=(0, 0, -.025))
    scene.world_axes.visible = False
    server.initial_camera.position = (3.3, -4.3, 3.1)
    server.initial_camera.look_at = (0, 0, .6)
    server.initial_camera.up = (0, 0, 1)
    scene.add_box("/robot/base", dimensions=(.58, .58, .16), color=(49, 64, 54), position=(0,0,.08))
    scene.add_box("/robot/pedestal", dimensions=(.28,.28,.42),color=(190,199,184), position=(0,0,.32))
    for y, label in [(-.75, "01 / PICK"), (.75, "02 / PLACE")]:
        key = "pick" if y < 0 else "place"
        scene.add_box(f"/stations/{key}/plinth", dimensions=(.6,.6,.18), position=(.75,y,.09), color=(195,204,188))
        scene.add_box(f"/stations/{key}/surface", dimensions=(.64,.64,.035), position=(.75,y,.1975), color=(225,228,215))
        scene.add_label(f"/stations/{key}/label", label, position=(1.11,y,.24), font_screen_scale=.75)
    shoulder = np.array([0.,0.,.58])
    joints = [scene.add_icosphere(f"/robot/joint_{i}", radius=.115 if i < 2 else .09,
                                 color=(48,63,51),subdivisions=2) for i in range(3)]
    links = [scene.add_box(f"/robot/link_{i}", dimensions=(.145,.145,length), color=(96,133,106))
             for i,length in enumerate([.78,.78,.16])]
    wrist = scene.add_box("/robot/gripper/palm", dimensions=(.25,.16,.09), color=(50,66,57))
    fingers = [scene.add_box(f"/robot/gripper/finger_{i}", dimensions=(.035,.08,.15),color=(62,74,65)) for i in range(2)]
    parcel = scene.add_box("/object/part", dimensions=(.16,.16,.16), color=(210,125,72), position=(.75,-.75,.295))
    samples = np.array([tool_pose(t) for t in np.linspace(0,12,241)])
    scene.add_line_segments("/trajectory/tool_path", points=np.stack([samples[:-1],samples[1:]],axis=1),
                            colors=(198,113,62), thickness=2, thickness_units="screen")
    marker = scene.add_icosphere("/trajectory/current", radius=.035, color=(243,163,93),subdivisions=2)
    for i, pos in enumerate([(-1.35,-1.1,1.5),(-1.2,1.3,1.45),(1.65,1.5,1.65)]):
        pos=np.array(pos); direction=np.array([.5,0,.65])-pos
        scene.add_camera_frustum(f"/cameras/view_{i+1}", fov=.8, aspect=1.5,scale=.22,
                                  color=(104,142,166),thickness=.008, position=pos,wxyz=rotation_from_z(direction))
        scene.add_label(f"/cameras/label_{i+1}", f"CAM 0{i+1}", position=pos+np.array([0,0,.14]), font_screen_scale=.65)
    def update(t: float):
        target=tool_pose(t)
        # Equal-length planar 2-link inverse kinematics, plus vertical tool link.
        end=target+np.array([0,0,.16]); delta=end-shoulder
        d=np.linalg.norm(delta); center=(end+shoulder)/2
        radial=np.array([delta[0],delta[1],0.]); radial/=np.linalg.norm(radial)
        normal=np.cross(np.cross(radial,np.array([0.,0.,1.])),delta/d)
        elbow=center+normal*math.sqrt(max(.78**2-(d/2)**2,0))
        points=[shoulder,elbow,end,target]
        for i,link in enumerate(links):
            a,b=points[i:i+2]; link.position=(a+b)/2; link.wxyz=rotation_from_z(b-a)
        for joint,p in zip(joints,points): joint.position=p
        wrist.position=target
        gripping=2<=t<=8
        opening=.097 if gripping else .145
        for i,finger in enumerate(fingers): finger.position=target+np.array([(-1 if i==0 else 1)*opening,0,-.105])
        if t<2: parcel.position=(.75,-.75,.295)
        elif t<=8: parcel.position=target-np.array([0,0,.185])
        else: parcel.position=(.75,.75,.295)
        marker.position=target
    update(0)
    return update


def copy_client():
    """The PyPI wheel includes the upstream production single-file browser build."""
    source=Path(viser.__file__).parent / "client"
    out=OUTPUT/"viewer"; out.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source/"build/index.html",out/"index.html")
    dist=distribution("viser")
    shutil.copy2(dist.locate_file("viser-1.1.1.dist-info/licenses/LICENSE"),out/"LICENSE-viser.txt")
    shutil.copy2(source/"package.json",out/"upstream-package.json")
    shutil.copy2(source/"package-lock.json",out/"upstream-package-lock.json")
    # Keep existing third-party notices maintained alongside the reusable script.
    shutil.copy2(ROOT/"scripts/viser/THIRD_PARTY_NOTICES.md",out/"THIRD_PARTY_NOTICES.md")
    return hashlib.sha256((out/"index.html").read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--serve", action="store_true"); parser.add_argument("--port",type=int,default=8087)
    args=parser.parse_args()
    OUTPUT.mkdir(parents=True,exist_ok=True)
    server=viser.ViserServer(host="127.0.0.1",port=args.port,label="Spatial Replay")
    server.gui.configure_theme(brand_color=(86,120,91),show_share_button=False)
    update=make_scene(server)
    recorder=server.get_scene_serializer()
    for frame in range(FRAMES):
        update(frame/FPS)
        recorder.insert_sleep(1/FPS)
    path=OUTPUT/"pick-place.viser"; path.write_bytes(recorder.serialize())
    metadata={"viser_version":viser.__version__,"frames":FRAMES,"fps":FPS,"duration_seconds":FRAMES/FPS,
              "asset":"pick-place.viser","sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
              "client_sha256":copy_client(),"motion":"Original procedural kinematics; not physical simulation",
              "upstream":"https://github.com/nerfstudio-project/viser"}
    (OUTPUT/"metadata.json").write_text(json.dumps(metadata,indent=2)+"\n")
    print(json.dumps(metadata,indent=2),flush=True)
    if args.serve:
        update(0)
        server.gui.add_markdown("### Pick-and-place replay\nOriginal CPU-generated kinematic scene. Orbit with the mouse.")
        playing=server.gui.add_checkbox("Play motion",initial_value=True)
        slider=server.gui.add_slider("Time (s)",min=0,max=12,step=.05,initial_value=0)
        @slider.on_update
        def _(_event): update(float(slider.value))
        export=server.gui.add_button("Download recording")
        @export.on_click
        def _(event):
            if event.client: event.client.send_file_download("pick-place.viser",path.read_bytes())
        while True:
            if playing.value: slider.value=(slider.value+1/FPS)%12
            time.sleep(1/FPS)
    else: server.stop()

if __name__ == "__main__": main()
