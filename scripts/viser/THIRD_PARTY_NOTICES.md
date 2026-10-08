# Viser browser client attribution

The adjacent `index.html` is the unmodified, self-contained production client distributed in the **Viser 1.1.1** PyPI wheel, `viser/client/build/index.html`.

- Upstream project: https://github.com/nerfstudio-project/viser (redirects to the current Viser project organization).
- Documentation: https://viser.studio/main/
- License: Apache-2.0. Full original copyright and license text: [LICENSE-viser.txt](./LICENSE-viser.txt).
- Exact dependency declarations and resolved package metadata are preserved in [upstream-package.json](./upstream-package.json) and [upstream-package-lock.json](./upstream-package-lock.json).
- Full original dependency license texts, collected from the exact locked npm distributions: [DEPENDENCY_LICENSES.md](./DEPENDENCY_LICENSES.md). The collection includes build dependencies as a conservative superset.

The browser client builds on React, React DOM, Three.js, React Three Fiber, Drei, Mantine, Tabler Icons, msgpack, meshoptimizer, uPlot, zstddec, and other dependencies listed in the lockfile. Each retains its respective upstream copyright and license. The lockfile records dependency license identifiers and source package locations; the companion license-text collection retains the original available LICENSE / NOTICE / COPYING files.

The surrounding page, procedural robot, station geometry, camera layouts, and motion recording were created for this collection. No robot manufacturer meshes, paper datasets, captured demonstrations, or third-party scene assets are included.
