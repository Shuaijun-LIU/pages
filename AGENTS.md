# Project website collection

## Robot experiment visualization

- Prefer **Viser** when adding robot experiment results to project websites. The user explicitly chose this workflow: export scenes from Python, retain robot playback and observation-camera frusta, and publish with the official static viewer.
- Start with `docs/reuse/robot-viewer-choice.md` and `docs/reuse/viser.md`. Reuse `scripts/viser/generate.py` and the existing viewer integration before building another renderer.
- Use actual robot meshes and kinematics. Replace the sample trajectory with project results; preserve timestamps, units, joint ordering, coordinate frames and camera calibration.
- The current camera frusta are illustrative. New experiment pages must obtain poses and intrinsics from their experiment data; do not present invented camera geometry as measured data.
- Use custom Three.js for requirements such as scroll-linked camera motion, stylized heroes or a heavily customized UI. Explain the concrete need before choosing it over the default Viser workflow.
- Static `.viser` playback needs no Python backend. Python callbacks and live experiments require a running service and are not reproduced by a static recording.

## Collection presentation

- Keep English as the default, with the EN / 中文 header switch, concise descriptions, tags and the existing browser-frame preview cards.
- Put provenance, implementation notes and reuse restrictions in `catalog/` and `docs/reuse/`, not extra text on homepage cards.
- Keep Josephine’s World, Synesthesia and Pocket Grove as interaction references. Prioritize complete project-page structure when adding further Josephine-related examples.
- SARM2, SARM, LEGS, Justin Yu and POGS were removed at the user's request. Do not restore them as collection entries.
