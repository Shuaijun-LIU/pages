# Robot Studio：默认选择 Viser

用户决定（2026-10-09）：后续项目 agent **优先使用 Viser 将实验结果发布到网站**，保留机器人轨迹与相机视锥。Three.js 用于需要进一步定制的首屏与页面动效。

## 两个 Panda 示例的实际区别

两者使用相同的真实 Franka Panda 网格、七关节定义和 12 秒示例轨迹。差别在场景构建、数据更新和页面集成方式，不在机器人或实验内容。当前轨迹为编写的演示序列。

| | Panda · Trajectory | Panda · Viser |
| --- | --- | --- |
| 构建方式 | 手写 Three.js 前端 | Python Viser 场景 API + 官方 Viewer |
| 数据流程 | 浏览器加载 GLB、关节定义与轨迹 JSON，插值并计算 FK | Python 计算场景状态，序列化网格和带时间的变换为 `.viser` |
| 已有功能 | 自定义关节读数、TCP 坐标、路径、播放速度、镜头预设 | 原生时间轴、速度、场景树、自由视角、录像下载、三个相机视锥 |
| 修改入口 | `src/robot-demos/trajectory.js`、`arm.js`、`viewer.js` | `scripts/viser/generate.py`、`examples/viser-replay/index.html` |
| 更新数据 | 替换轨迹 JSON，浏览器重新加载 | 替换轨迹及相机数据，重新导出 `.viser` |
| 部署 | 静态前端 | 静态 Viewer + `.viser`，不需要在线 Python |
| 优先用途 | 定制 Hero、滚动联动、品牌动效和特殊 UI | 快速发布机器人、点云、相机和多物体实验场景 |

Viser 的浏览器端也使用 Three.js（React Three Fiber）。这是直接开发渲染界面与复用成熟可视化框架的区别。Three.js 同样能够画相机视锥，但当前自定义示例没有接入，Viser 已提供场景 API 与本例实现。

## 给后续项目 agent 的接入顺序

1. **整理实验输入**：真实机器人模型与关节顺序、带时间戳的关节/物体姿态、坐标系、米制单位，以及观测相机内参与外参。点云、图像和指标按实验已有内容添加。
2. **从已有生成器改造**：复用模型装配、FK、场景 serializer 和时间推进。当前 Panda JSON 接口只适用于其七关节模型，其他机器人需适配关节链或采用 Viser 的 URDF 支持。
3. **显示观测相机**：使用 `scene.add_camera_frustum()`，将标定内参转换为垂直 FOV 与宽高比，外参转换到统一场景坐标和 `wxyz` 四元数。如输入为 world-to-camera 矩阵，应先求逆得到相机在世界中的位姿。可选绑定实际相机图像。
4. **导出静态录制**：复用 `get_scene_serializer()`、场景更新、`insert_sleep(dt)` 与 `serialize()`；按实际时间戳保留速度关系。保留相机、模型与运动在同一坐标系和时钟下。
5. **发布到项目网站**：复制官方 Viewer、许可证和录制，以 iframe 的 `playbackPath` 加载。沿用相对路径做法以兼容 GitHub Pages 子目录。
6. **验收**：首帧有真实机器人；播放/暂停/拖动时间轴正常；相机视锥位置、方向、FOV 与实验标定一致；自由视角、手机布局、录制下载和资源请求均正常。

当前示例的三个蓝色视锥是示意布置，不能直接视为其他实验的标定结果。需要 Python 回调、实时机器人或交互修改实验状态时，另运行 Viser 服务；静态录制适合公开结果回放。

运行命令、固定版本与许可证见 [Viser 构建方法](viser.md)。深度定制需求见 [Three.js 模块](three-robot-demos.md)。
