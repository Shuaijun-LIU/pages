# Viser: a native Franka Panda recording

项目默认选型：**优先用 Viser 发布实验结果和相机视锥**；定制 Hero / 滚动动画再考虑直接 Three.js。见 [两条路线的区别与接入步骤](robot-viewer-choice.md)。

**Demo:** [Spatial Replay](../../examples/viser-replay/index.html)

**Upstream:** [Viser](https://github.com/nerfstudio-project/viser) · [official documentation](https://viser.studio/main/) · [embedding guide](https://viser.studio/main/embedded_visualizations/)

This example uses the actual Viser browser client and Python scene serializer. A Franka Panda is assembled from eleven original visual link meshes with their materials, seven revolute joints, and the two gripper fingers. The kinematic model and 12-second sample trajectory are shared with the Three.js example. The orange path is the tool-center position computed with forward kinematics from that joint trajectory. Three blue frusta illustrate observation-camera poses.

The motion is an authored joint-space sample. It does not represent physical execution or benchmark results.

## Reused components and exact versions

| Component | Reuse |
| --- | --- |
| `viser==1.1.1` | Python server, scene API, serializer, official browser playback client |
| `numpy==2.5.3` | Joint interpolation and forward-kinematics arrays |
| Shared `public/models/panda/` | Original Panda visual meshes converted to GLB and a parent-first kinematic manifest |
| `public/robot-demos/sample-trajectory.json` | Seven joint angles per sample, 30 Hz, 12 seconds |
| Official native playback controls | Play/pause, playback time, timeline scrubbing, speed, scene-tree inspection |
| Official native camera | Orbit, pan, and zoom independently of recorded robot motion |

The client is an unchanged upstream single-file production build. Its JavaScript, styles, decoder, and supporting assets are bundled inside the HTML. No external CDN is required. Its bundled Three.js is independent of the collection's npm Three.js version.

The client SHA-256 is `8c05b8bfea1ed54773a7616d1d868ebf0b45055ff8da8fc1603ccb2a7858f079`. Recording and trajectory checksums are stored in `public/examples/viser-replay/metadata.json`. The surrounding page adds accessible names to the same-origin embedded playback controls.

## Files and regeneration

- `examples/viser-replay/index.html`: responsive example page and same-origin iframe integration.
- `scripts/viser/generate.py`: model validation, forward kinematics, native mesh recording, optional live server, and upstream-client copying.
- `scripts/viser/requirements.txt`: direct Python dependencies.
- `scripts/viser/collect_licenses.py`: extracts license texts from exact upstream npm lockfile tarballs without installing or executing the packages.
- `public/examples/viser-replay/panda-motion.viser`: self-contained native recording, including GLB mesh bytes and articulated frame transforms.
- `public/examples/viser-replay/viewer/`: official client and license/dependency records.
- `tests/viser.spec.js`: native browser interaction checks.

From the repository root, with Python 3.12 or newer:

```bash
python3 -m venv /path/to/viser-env
/path/to/viser-env/bin/pip install -r scripts/viser/requirements.txt
/path/to/viser-env/bin/python scripts/viser/generate.py
python3 scripts/viser/collect_licenses.py
npm run build
npm run preview
```

To edit a live Viser session:

```bash
/path/to/viser-env/bin/python scripts/viser/generate.py --serve --port 8087
```

Open `http://127.0.0.1:8087`. The Python GUI exposes **Play motion**, **Time (s)**, and **Download recording**. The download button presents the native file notification; click its filename to save. Time changes invoke Python callbacks and update scene handles. The generator writes the static recording before entering its live loop. Edit the shared trajectory JSON to change the motion and regenerate the recording. All generator operations use CPU calculations.

## Kinematics and static hosting

Each model link gets a native Viser frame under its parent, plus a GLB visual child. A revolute joint applies its axis rotation after the manifest's fixed origin rotation. Finger translation uses the prismatic axis in the same local frame. Joint-angle samples are checked against all seven limits before export. The initial pose and every recorded pose use the same model transforms as the tool path.

The export uses `ViserServer.get_scene_serializer()`, scene-handle updates, `StateSerializer.insert_sleep(1 / 30)`, and `serialize()`. The 361 shared trajectory samples include both endpoints; the export records 360 intervals for exactly 12 seconds. All model bytes are embedded, so downloading the `.viser` file is sufficient to reopen the recording in a compatible Viser viewer.

The embedding page resolves its recording URL and sets the native client's `playbackPath` query parameter. Relative resolution supports GitHub project-page subpaths. Vite copies `public/examples/viser-replay/` into the corresponding distribution directory. The iframe explicitly requests `viewer/index.html`.

A live Python server is unnecessary for static hosting. Python callbacks, new recordings, and live robot connections require running the generator with `--serve`. Camera motion and native playback controls remain browser-local and interactive. Scene-tree edits can be superseded by later recording messages.

External environment-map loading is disabled. The embedded recording resolves its runtime requests locally. The upstream viewer requires a modern WebGL/WASM-capable browser.

## License and asset provenance

The actual LICENSE distributed in Viser 1.1.1 is **Apache-2.0**, preserved verbatim as `viewer/LICENSE-viser.txt`. Its manifest and exact npm lockfile are preserved. `viewer/DEPENDENCY_LICENSES.md` collects original dependency license texts, including build-time dependencies as a conservative superset. No upstream client source changes were made.

Panda mesh and model provenance, upstream revision, and license records are shared in [`public/models/panda/`](../../public/models/panda/). They are derived from the Franka Emika Panda model in [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie/tree/main/franka_emika_panda). The authored sample motion and illustrative camera placement belong to this collection.

## Verification

`npx playwright test tests/viser.spec.js` checks native static rendering, Panda metadata, pause/resume, timeline and direct-time seeking, camera orbit, playback speed, scene-tree access, recording download, reduced-motion handling, and phone viewport fit. The live Python server was also checked: changing its time slider changes the rendered Panda pose, and its native file notification downloads `panda-motion.viser`. The browser configuration uses a software renderer. Preview: [desktop screenshot](../previews/viser-replay.jpg).
