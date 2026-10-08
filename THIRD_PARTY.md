# Third-party notices

The application code, procedural dual-arm and prop geometry, favicon, and FIELDWORK copy were independently authored for this project. The following dependencies retain their own licenses:

- **Three.js** — MIT. https://github.com/mrdoob/three.js/blob/dev/LICENSE
- **Vite** — MIT. https://github.com/vitejs/vite/blob/main/LICENSE
- **Playwright** — Apache-2.0. https://github.com/microsoft/playwright/blob/main/LICENSE
- **DM Sans** — SIL Open Font License 1.1. Distributed through `@fontsource-variable/dm-sans`; license included in that package.
- **IBM Plex Mono** — SIL Open Font License 1.1. Distributed through `@fontsource/ibm-plex-mono`; license included in that package.

Font license texts are distributed with the deployed site under `licenses/`. No assets from the visual reference website are redistributed.

## Humanoid geometry

**Unitree G1**, from [Google DeepMind MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie/tree/b846dd12bc459d776cccb3dee0b1d02acbf7a9c7/unitree_g1), is distributed under **BSD-3-Clause**. Copyright (c) 2016-2023 HangZhou YuShu TECHNOLOGY CO.,LTD. ("Unitree Robotics").

The adapted model is `public/models/humanoid.glb`. Changes include mesh simplification, a web coordinate frame, preserved joint metadata, and omission of collision and logo geometry. Animation choreography is authored for this project. The full license is in [public/licenses/Unitree-G1-BSD.txt](public/licenses/Unitree-G1-BSD.txt); detailed source provenance and checksums are in [public/models/humanoid-source.json](public/models/humanoid-source.json). The conversion tool is [scripts/build-robot-asset.mjs](scripts/build-robot-asset.mjs).
