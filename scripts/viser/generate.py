"""Export the shared Franka Panda mesh model and joint trajectory with native Viser.

Run from repository root. --serve keeps a real Python Viser server online.
Forward kinematics and serialization are CPU-only; motion is an authored sample.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import time
from importlib.metadata import distribution

import numpy as np
import viser
import viser.transforms as tf

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/examples/viser-replay"
MODEL_DIR = ROOT / "public/models/panda"
TRAJECTORY_PATH = ROOT / "public/robot-demos/sample-trajectory.json"
ASSET = "panda-motion.viser"


def load_inputs():
    model = json.loads((MODEL_DIR / "panda.json").read_text())
    trajectory = json.loads(TRAJECTORY_PATH.read_text())
    revolute = [link["joint"] for link in model["links"] if (link.get("joint") or {}).get("type") == "revolute"]
    if len(revolute) != 7:
        raise ValueError("Expected all seven Panda revolute joints")
    for frame in trajectory["frames"]:
        if len(frame["q"]) != 7:
            raise ValueError("Panda trajectory must contain seven joint angles per frame")
        for joint in revolute:
            if not joint["limits"][0] <= frame["q"][joint["index"]] <= joint["limits"][1]:
                raise ValueError(f"Joint {joint['name']} is outside the model limits")
    return model, trajectory


def local_pose(link, q, finger_position):
    rotation = tf.SO3(np.asarray(link["quaternion"], dtype=float))
    position = np.asarray(link["position"], dtype=float)
    joint = link.get("joint")
    if joint:
        axis = np.asarray(joint["axis"], dtype=float)
        if joint["type"] == "revolute":
            rotation = rotation @ tf.SO3.exp(axis * q[joint["index"]])
        elif joint["type"] == "prismatic":
            position = position + rotation @ (axis * finger_position)
    return tf.SE3.from_rotation_and_translation(rotation, position)


def forward_kinematics(model, q):
    poses = {}
    for link in model["links"]:
        local = local_pose(link, q, model["fingerPosition"])
        poses[link["name"]] = poses[link["parent"]] @ local if link["parent"] else local
    tcp = model["tcp"]
    return poses, poses[tcp["parent"]] @ np.asarray(tcp["position"])


def rotation_from_z(vector):
    z = vector / np.linalg.norm(vector)
    helper = np.array([0., 1., 0.]) if abs(z[1]) < .9 else np.array([1., 0., 0.])
    x = np.cross(helper, z); x /= np.linalg.norm(x)
    return tf.SO3.from_matrix(np.column_stack([x, np.cross(z, x), z])).wxyz


def make_scene(server, model, trajectory):
    scene = server.scene
    scene.set_up_direction("+z")
    scene.configure_environment_map(None)
    scene.configure_default_lights(enabled=True, cast_shadow=False)
    scene.add_light_ambient("/illumination", intensity=.7)
    scene.add_grid("/workspace/grid", width=2.8, height=2.5, cell_size=.1,
                   section_size=.5, cell_color=(211, 218, 207),
                   section_color=(183, 194, 178), plane_color=(238, 241, 234),
                   plane_opacity=1, shadow_opacity=0, position=(0, 0, -.012))
    scene.world_axes.visible = False
    server.initial_camera.position = (1.9, -2.2, 1.6)
    server.initial_camera.look_at = (.2, 0, .48)
    server.initial_camera.up = (0, 0, 1)
    handles, paths = {}, {}
    for link in model["links"]:
        parent = paths[link["parent"]] if link["parent"] else "/panda"
        path = paths[link["name"]] = f"{parent}/{link['name']}"
        local = local_pose(link, trajectory["frames"][0]["q"], model["fingerPosition"])
        handles[link["name"]] = scene.add_frame(path, show_axes=False,
            position=local.translation(), wxyz=local.rotation().wxyz)
        scene.add_glb(f"{path}/visual", (MODEL_DIR / link["mesh"]).read_bytes(),
                      cast_shadow=False, receive_shadow=False)
    samples = np.array([forward_kinematics(model, frame["q"])[1] for frame in trajectory["frames"]])
    scene.add_line_segments("/trajectory/tool_path", points=np.stack([samples[:-1], samples[1:]], axis=1),
                            colors=(198, 113, 62), thickness=2, thickness_units="screen")
    marker = scene.add_icosphere("/trajectory/current", radius=.014, color=(243,163,93), subdivisions=2)
    for i, pos in enumerate([(-.62,-.68,.95),(-.58,.76,.9),(.85,.75,1.05)]):
        pos = np.array(pos)
        scene.add_camera_frustum(f"/cameras/view_{i+1}", fov=.8, aspect=1.5, scale=.11,
            color=(104,142,166), thickness=.004, position=pos,
            wxyz=rotation_from_z(np.array([.25,0,.45])-pos))
        scene.add_label(f"/cameras/label_{i+1}", f"CAM 0{i+1}", position=pos+np.array([0,0,.08]), font_screen_scale=.65)
    times = np.array([frame["t"] for frame in trajectory["frames"]])
    angles = np.array([frame["q"] for frame in trajectory["frames"]])
    def update(t):
        q = np.array([np.interp(t, times, angles[:, j]) for j in range(7)])
        for link in model["links"]:
            local = local_pose(link, q, model["fingerPosition"])
            handle = handles[link["name"]]
            handle.position, handle.wxyz = local.translation(), local.rotation().wxyz
        marker.position = forward_kinematics(model, q)[1]
    update(0)
    return update


def copy_client():
    """The PyPI wheel includes the upstream production single-file browser build."""
    source = Path(viser.__file__).parent / "client"
    out = OUTPUT / "viewer"; out.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source / "build/index.html", out / "index.html")
    dist = distribution("viser")
    shutil.copy2(dist.locate_file("viser-1.1.1.dist-info/licenses/LICENSE"), out / "LICENSE-viser.txt")
    shutil.copy2(source / "package.json", out / "upstream-package.json")
    shutil.copy2(source / "package-lock.json", out / "upstream-package-lock.json")
    shutil.copy2(ROOT / "scripts/viser/THIRD_PARTY_NOTICES.md", out / "THIRD_PARTY_NOTICES.md")
    return hashlib.sha256((out / "index.html").read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port", type=int, default=8087)
    args = parser.parse_args()
    model, trajectory = load_inputs()
    fps, duration = trajectory["sampleRate"], trajectory["duration"]
    frames = round(duration * fps)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    server = viser.ViserServer(host="127.0.0.1", port=args.port, label="Franka Panda Replay")
    server.gui.configure_theme(brand_color=(86,120,91), show_share_button=False)
    update = make_scene(server, model, trajectory)
    recorder = server.get_scene_serializer()
    for frame in range(frames):
        update(frame / fps)
        recorder.insert_sleep(1 / fps)
    path = OUTPUT / ASSET
    path.write_bytes(recorder.serialize())
    metadata = {
        "viser_version": viser.__version__, "frames": frames, "fps": fps,
        "duration_seconds": duration, "asset": ASSET,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "client_sha256": copy_client(), "robot": model["name"], "arm_dof": 7,
        "visual_meshes": len(model["links"]), "model_manifest": "../../models/panda/panda.json",
        "trajectory": "../../robot-demos/sample-trajectory.json",
        "trajectory_sha256": hashlib.sha256(TRAJECTORY_PATH.read_bytes()).hexdigest(),
        "motion": "Authored joint-space sample with model forward kinematics",
        "upstream": "https://github.com/nerfstudio-project/viser",
    }
    (OUTPUT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata, indent=2), flush=True)
    if args.serve:
        update(0)
        server.gui.add_markdown("### Franka Panda · 7 DOF\nShared manufacturer-derived link meshes and joint-space sample. Orbit with the mouse.")
        playing = server.gui.add_checkbox("Play motion", initial_value=True)
        slider = server.gui.add_slider("Time (s)", min=0, max=duration, step=1/fps, initial_value=0)
        @slider.on_update
        def _(_event): update(float(slider.value))
        export = server.gui.add_button("Download recording")
        @export.on_click
        def _(event):
            if event.client: event.client.send_file_download(ASSET, path.read_bytes())
        while True:
            if playing.value: slider.value = (slider.value + 1/fps) % duration
            time.sleep(1/fps)
    else:
        server.stop()

if __name__ == "__main__":
    main()
