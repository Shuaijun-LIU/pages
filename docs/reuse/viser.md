# Viser: a native interactive robot recording

**Demo:** [Spatial Replay](../../examples/viser-replay/index.html)
**Upstream:** [Viser](https://github.com/nerfstudio-project/viser) · [official documentation](https://viser.studio/main/) · [embedding guide](https://viser.studio/main/embedded_visualizations/)

This example uses the actual Viser browser client and Python scene serializer. It contains an original procedural three-link robot arm, two transfer stations, a tool trajectory, three observation-camera frusta, and a 12-second, 240-frame pick-and-place sequence. The animation is kinematic choreography generated for the example, not physics simulation, a learned controller, or reported experimental data.

## Reused components and exact versions

| Component | Reuse |
| --- | --- |
| `viser==1.1.1` | Python server, scene API, serializer, official browser playback client |
| `numpy==2.5.3` | Original trajectory and elementary inverse-kinematics calculations |
| `viser/client/build/index.html` inside the PyPI wheel | Copied unchanged to `public/examples/viser-replay/viewer/index.html` |
| Official native playback controls | Play/pause, playback time, timeline scrubbing, speed, scene-tree inspection |
| Official native camera | Orbit, pan, and zoom independently of recorded robot motion |

The client is an upstream single-file production build. Its JavaScript, styles, decoder, and supporting assets are bundled inside the HTML, so no application-specific client build or external CDN is required. Its independent bundled Three.js does not use the collection's npm Three.js version.

The exact client SHA-256 is `8c05b8bfea1ed54773a7616d1d868ebf0b45055ff8da8fc1603ccb2a7858f079`. Recording metadata and checksums are stored in `public/examples/viser-replay/metadata.json`. The original production bundle is retained without modification; the surrounding page adds accessible names to the same-origin embedded playback controls.

## Files and regeneration

- `examples/viser-replay/index.html`: responsive example page and same-origin iframe integration.
- `scripts/viser/generate.py`: original scene creation, elementary IK, native recording export, optional live server, and upstream-client copying.
- `scripts/viser/requirements.txt`: direct Python dependencies.
- `scripts/viser/collect_licenses.py`: extracts LICENSE / NOTICE / COPYING texts from exact upstream npm lockfile tarballs without installing or executing the packages.
- `public/examples/viser-replay/pick-place.viser`: exported native scene recording.
- `public/examples/viser-replay/viewer/`: official client and license/dependency records.
- `tests/viser.spec.js`: actual native browser interaction checks.

From the repository root, with Python 3.12 or newer:

```bash
python3 -m venv /path/to/viser-env
/path/to/viser-env/bin/pip install -r scripts/viser/requirements.txt
/path/to/viser-env/bin/python scripts/viser/generate.py
python3 scripts/viser/collect_licenses.py
npm run build
npm run preview
```

To edit a real live Viser session:

```bash
/path/to/viser-env/bin/python scripts/viser/generate.py --serve --port 8087
```

Open `http://127.0.0.1:8087`. The Python GUI exposes **Play motion**, **Time (s)**, and **Download recording**. Time changes invoke Python callbacks and update scene handles. The generator also writes the static recording before entering its live loop. Editing `tool_pose()` changes the trajectory; editing `make_scene()` changes the robot, stations, and cameras. All generated geometry uses CPU calculations and requires no simulation engine or model downloads.

## Static hosting contract

The export uses `ViserServer.get_scene_serializer()`, scene-handle updates, `StateSerializer.insert_sleep(1 / 20)`, and `serialize()`. Every scene element is added through `server.scene`, matching the upstream export workflow. The embedding page resolves the recording URL from its own URL and sets the native client's `playbackPath` query parameter. Relative resolution supports GitHub project-page subpaths.

Vite copies `public/examples/viser-replay/` into `dist/examples/viser-replay/`, alongside the built example entry. The iframe explicitly requests `viewer/index.html`, which also works under Vite development serving. The live server is **not** required on GitHub Pages. Static playback uses the exported scene messages and the browser's local Viser controls; arbitrary Python callbacks, new trajectory generation, and live robot connections require running the Python server separately. Scene-tree edits are browser-local and can be superseded by later recording messages. Camera motion remains interactive during playback.

The scene explicitly disables external environment-map loading. Browser checks observed no third-party network requests for the embedded recording. Modern WebGL/WASM-capable browsers are required by the upstream viewer.

## License and asset provenance

The **actual LICENSE distributed in Viser 1.1.1 is Apache-2.0**, preserved verbatim as `viewer/LICENSE-viser.txt`. This is the source of truth for this copy; older package classifiers describing MIT do not override the shipped license. The upstream dependency manifest and exact npm lockfile are preserved. `viewer/DEPENDENCY_LICENSES.md` collects original dependency license texts, including build-time dependencies as a conservative superset, and `viewer/THIRD_PARTY_NOTICES.md` identifies the distribution. No upstream client source changes were made.

The robot, cameras, stations, trajectory, and animation were created specifically for this collection. No manufacturer meshes, external robot recordings, publication figures, or benchmark data are included.

## Verification evidence

The example was checked against the real Viser 1.1.1 Python server and its exported static client:

- Native static scene renders, with 240-frame / 12-second metadata.
- Pausing holds the native time input steady; setting 5.0 seconds scrubs the recording; resuming advances it.
- Dragging the Viser canvas changes the rendered view while playback is paused.
- Native scene-tree panel opens and recording download succeeds.
- A reduced-motion preference pauses playback on initial load; deliberate play resumes normally.
- The example fits a 390-pixel-wide viewport and resolves all runtime requests locally.
- Live Python GUI time changes update scene geometry, and its export button returns `pick-place.viser`.

Run the three committed browser checks with `npx playwright test tests/viser.spec.js`. The collection's Playwright configuration uses a software renderer for reproducible browser checks. Preview: [desktop screenshot](../previews/viser-replay.jpg).
