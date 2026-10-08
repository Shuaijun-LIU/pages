# Three.js 机器人交互示例复用

两个可独立打开的 Vite 入口，使用同一组渲染、相机和时间轴组件：

- `examples/robot-hero/index.html`：G1 模型、拖动/缩放、视角预设、相机巡航、关节展示动画、暂停和重置。
- `examples/robot-trajectory/index.html`：真实 Franka Panda 七轴网格、样本关节序列、TCP 轨迹、拖动时间轴、播放速度和关节读数。

不依赖后端、CDN 或运行时模型推理。Three.js、字体均沿用仓库已安装依赖。示例在小屏幕下纵向排列，支持键盘和减少动态效果设置。

## 文件边界

| 文件                                        | 作用                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `src/robot-demos/viewer.js`                 | Three.js stage、灯光、地面、OrbitControls、相机过渡、尺寸同步与资源释放 |
| `src/robot-demos/timeline.js`               | 可独立使用的播放时钟                                                    |
| `src/robot-demos/hero.js`                   | GLTFLoader 加载 G1、关节动画与 UI 绑定                                  |
| `src/robot-demos/arm.js`                    | Panda GLB 网格与 MJCF 七关节层级、前向运动学与样本插值                                  |
| `src/robot-demos/trajectory.js`             | 样本加载、TCP 轨迹与回放 UI                                             |
| `src/robot-demos/style.css`                 | 两个示例独立使用的界面样式                                              |
| `public/robot-demos/sample-trajectory.json` | 361 帧、30 Hz、12 秒的示例关节序列                                      |
| `public/models/panda/` | Panda 11 个连杆 GLB、共享关节清单、来源与 Apache-2.0 许可证 |
| `public/models/humanoid.glb`                | 已有的 G1 模型，约 1.6 MB，两个页面不复制权重或模型                     |

## 快速运行

```bash
npm install
npm run dev
# /examples/robot-hero/
# /examples/robot-trajectory/
```

本仓库的 Vite 配置会自动发现 `examples/*/index.html`。生产构建沿用仓库 `npm run build`。资源通过 `new URL('../../models/...', document.baseURI)` 等相对路径解析，兼容站点根路径和 `/pages/` 子目录部署。

迁移到另一个项目时，复制所需 HTML、`src/robot-demos/` 以及相应静态资源，安装 `three@0.180.0`、`@fontsource-variable/dm-sans`、`@fontsource/ibm-plex-mono`。如果改变入口层级，同时修改 `publicAsset()` 和 HTML 内相对链接。保留资源许可证。

## 共享 API

```js
import { createViewer, bindCameraButtons } from "./viewer.js";

const viewer = createViewer(document.querySelector("#stage"), {
  target: [0, 0.7, 0],
  position: [2, 1.5, 3],
  onFrame(elapsed, delta) {
    // 时间单位：秒；delta 最大 0.1 秒，后台标签页不推进时间。
  },
});
if (viewer) {
  viewer.scene.add(robotRoot);
  viewer.preset([0, 1, 3]); // 平滑切换；减少动态效果时立即切换
  viewer.reset();
  // 卸载组件时调用 viewer.dispose()
}
```

`createViewer()` 可通过 `exposure` 和 `lightIntensity` 调整展示光照，默认保持 G1 既有灯光；Panda 使用 0.95 / 0.6，以保留白色外壳与深色接头的细节。

`createViewer()` 返回 `scene, camera, renderer, controls, preset, reset, dispose`。若浏览器不能创建 WebGL 2 上下文，会在 stage 中显示清楚的提示并返回 `null`。`bindCameraButtons(viewer, presets, onChange)` 自动连接 HTML 的 `button[data-camera]`，同步 `aria-pressed`。

```js
import { createTimeline } from "./timeline.js";
const playback = createTimeline({
  duration: 12,
  playing: false,
  loop: true,
  onChange({ time, duration, playing, speed }) {
    /* 更新姿态和 UI */
  },
});
playback.tick(delta); // 在渲染循环中推进
playback.seek(6); // 定位并暂停
playback.speed(0.5); // 0.5 倍播放
playback.toggle();
playback.reset(); // 回到 0 秒并暂停
```

`state` 暴露当前时间、时长、播放状态和速度。修改 UI 后可调用 `notify()` 执行一次同步。

## 替换机器人模型

Hero 使用官方 [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)，相机使用官方 [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)。没有重新实现文件解析或鼠标轨道控制。

1. 将 `.glb` 放入 `public/models/`，替换 `hero.js` 的模型地址。
2. 模型坐标约定为米、右手系、Y 向上；通过外层 Group 调整单位和旋转。
3. 根据包围盒设置 `target`、`position` 和相机预设。
4. 本 G1 资产包含 `node.userData.jointAxis`，各关节应用 `bindQuaternion × axisAngle`。其他模型应提供对应关节映射，或直接使用其 glTF animation clips 和 `THREE.AnimationMixer`。
5. 展示材质在 `hero.js` 中统一成浅金属与深绿色；删除该覆盖可使用源材质。

Hero 中的摆臂是轻量展示动画，不是动力学仿真。通过 `play` 暂停后停止关节动画；巡航也随之暂停。手动拖动或选取预设视角会退出巡航。重置同时恢复默认视角、停止巡航并回到动画起点。

## 替换轨迹

```json
{
  "name": "My sequence",
  "units": "radians",
  "duration": 12,
  "sampleRate": 30,
  "frames": [
    { "t": 0, "q": [0, -0.4, 0, -2, 0, 1.6, 0.7854] },
    { "t": 12, "q": [0, -0.4, 0, -2, 0, 1.6, 0.7854] }
  ]
}
```

时间戳必须严格递增、从 0 开始，末帧时间等于 `duration`；至少两帧。`q` 有七个弧度值，顺序为 Panda joint1–joint7。每个关节先应用 MJCF 固定原点变换，再绕局部 Z 轴转动。角度必须在 `public/models/panda/panda.json` 记录的真实关节限位内。`sampleTrajectory()` 在相邻关节样本之间做线性插值；如果真实关节角跨 ±π，请先展开角度。

样本是离线生成的确定性七关节正弦序列，便于复现展示；运行 `python3 scripts/build-panda-trajectory.py` 可重新生成。使用原始 Panda 连杆坐标和长度。两指保持 0.025 m 开度，TCP 为 hand 坐标系的 `[0, 0, 0.1034]` m；它从实际场景层级计算。浅色轨迹展示全部样本，深色轨迹展示已播放区间。TCP/角度读数随拖动实时更新。

`await createArm(manifestURL)` 加载真实 Panda visual meshes，返回 `{ root, setPose(q), getTCP(), limits, model, meshCount }`。原始资产是米制 Z-up，外层 root 绕 X 转 −π/2 适配 Three.js 的 Y-up 地面；页面 TCP 读数沿 Three.js 展示世界坐标。模型关节、网格和样本与 Viser 录制共享，Viser 保持原始 Z-up。

`public/models/panda/panda.json` 按父节点先于子节点排列，记录每个 link 的 parent、position、wxyz quaternion、mesh 路径和 joint axis/limits/index。GLB 网格保留原始顶点、面和颜色，不使用基础几何近似机械臂。`scripts/build-panda-assets.py --cache /tmp/panda-source` 可用 numpy/trimesh 重建资产；源文件校验值和提交固定在 `source.json`。

## 操作与无障碍

- 鼠标拖动旋转、滚轮缩放；触屏支持单指旋转与双指缩放。
- Canvas 可聚焦；方向键调整相机，`+` / `-` 缩放。
- 所有控制使用原生按钮、范围滑块、复选框和选择框。
- `prefers-reduced-motion: reduce` 默认暂停关节动画和回放，关闭相机缓动；用户仍可主动播放。
- 时间轴拖动会暂停，便于检查某一帧。重置回到 0 秒。
- 动态坐标没有设置高频 `aria-live`，避免屏幕阅读器持续播报。

## 来源与许可证

- Three.js 0.180.0 及其 `OrbitControls` / `GLTFLoader`：MIT；见依赖 `three/LICENSE`。渲染循环遵循官方 [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) 的 `setAnimationLoop` API。
- G1：复用仓库 `public/models/humanoid.glb`；完整来源、提交、转换方法和网格统计见 `public/models/humanoid-source.json`。上游为 [MuJoCo Menagerie / Unitree G1](https://github.com/google-deepmind/mujoco_menagerie/tree/b846dd12bc459d776cccb3dee0b1d02acbf7a9c7/unitree_g1)，BSD-3-Clause；保留 `public/licenses/Unitree-G1-BSD.txt`。版权归 Unitree Robotics。
- DM Sans / IBM Plex Mono：SIL Open Font License；保留 `public/licenses/DM-Sans-OFL.txt` 与 `public/licenses/IBM-Plex-Mono-OFL.txt`。
- Panda：Google DeepMind [MuJoCo Menagerie / Franka Emika Panda](https://github.com/google-deepmind/mujoco_menagerie/tree/0059d4335f8156206f63a35662313385f7ad6d74/franka_emika_panda)，源自 Franka Emika `franka_ros` 视觉网格；Apache-2.0。保留 `public/models/panda/LICENSE`、原始 `panda.xml` 和逐文件哈希 `source.json`。原始 OBJ 按连杆无简化转换成 GLB。七关节样本序列为本示例编写。

## 验证

`tests/robot-demos.spec.js` 检查两个入口的模型加载、相机预设、键盘与鼠标交互、手机/平板宽度、减少动态效果、暂停/恢复、巡航/重置、时间轴/FK 坐标变化、速度选择和轨迹显隐，并检查 Panda 七关节、真实网格加载与所有样本关节限位。

```bash
# 先启动 dev 或 preview；按实际端口设置
TEST_BASE_URL=http://127.0.0.1:4188 npx playwright test tests/robot-demos.spec.js
```

截图人工检查涵盖 1440px 桌面与 390px 手机，浏览器使用软件渲染。WebGL 是这两个示例的必要能力；无法使用时提供文字提示。
