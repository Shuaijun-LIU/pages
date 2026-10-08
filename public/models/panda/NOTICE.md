# Franka Emika Panda visual model

Source: [Google DeepMind MuJoCo Menagerie / Franka Emika Panda](https://github.com/google-deepmind/mujoco_menagerie/tree/0059d4335f8156206f63a35662313385f7ad6d74/franka_emika_panda), commit `0059d4335f8156206f63a35662313385f7ad6d74`.

The Menagerie description and visual meshes derive from the publicly available Franka Emika `franka_ros` robot description. Distributed under [Apache License 2.0](LICENSE), retained in full alongside these files. Original upstream rights and copyright notices remain applicable.

Local modifications: converted all original OBJ **visual** meshes to eleven per-link GLB files, preserving vertices and faces without decimation and assigning the original MJCF material colors. Collision meshes and collision primitives are not displayed. `panda.json` records the original MJCF link transforms, seven revolute joint axes and limits, and two prismatic fingers. The TCP is hand-local `[0, 0, 0.1034]` metres. The original `panda.xml` is retained for reference.

See [source.json](source.json) for source and output SHA-256 hashes, per-link face counts, and conversion details. Rebuild using `scripts/build-panda-assets.py` with NumPy and Trimesh. Both the Three.js trajectory example and the Viser recording use these assets and the same authored seven-joint samples. The sample is a visualization sequence.
