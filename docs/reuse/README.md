# 机器人项目网站复用库

集锦现有 14 个入口：原有 4 个项目、Robot Studio、WARP-RM、EgoMI / Real2Render2Real、CaP-X，以及 Josephine’s World、Synesthesia、Pocket Grove、Crater、Inner Space、Glance。新增设计参考的[筛选与实现线索](josephine-designs.md)记录了无限画布、声音驱动视觉和森林场景。Robot Studio 内切换 G1、Franka Panda 轨迹与 Panda Viser，后两者采用同一套真实机器人网格和关节定义。EgoMI 与 Real2Render2Real 在同一入口切换原站。SARM2、SARM、LEGS、Justin Yu、POGS 已撤下；既有源码档案和审计记录仅供历史查阅。

机器人模型、轨迹和 Viewer 自托管，不依赖参考站或在线 Python 后端。切换视图卸载上一场景，URL hash 可直接定位到目标标签。

## 默认选型：Viser 优先

用户要求后续项目 agent 优先用 **Viser** 将 Python 实验场景发布到网站，保留轨迹、自由视角和相机视锥。两种 Panda 示例共享同一套模型与轨迹；Three.js 适合深度定制首屏，Viser 适合快速接入实验数据。详见 [区别与接入步骤](robot-viewer-choice.md)，以及仓库根目录 `AGENTS.md`。

## 从哪里开始

| 目标 | 优先入口 | 可直接复用的部分 |
| --- | --- | --- |
| **实验结果发布（默认）** | [Viser Replay](../../examples/viser-replay/index.html) | Python 场景导出、机器人与相机视锥、静态 Viewer |
| 机器人 3D Hero | [Robot Hero](../../examples/robot-hero/index.html) | `createViewer()`、GLTFLoader、OrbitControls、镜头预设与巡航 |
| 机器人轨迹展示 | [Robot Trajectory](../../examples/robot-trajectory/index.html) | 播放时钟、关节插值、TCP 路径、时间轴与速度控制 |
| Python 生成场景后静态发布 | [Viser Replay](../../examples/viser-replay/index.html) | Viser serializer、官方静态 Viewer、时间轴与拖拽视角 |
| 个人主页／论文页面结构 | [来源与核心文件](justin-sources.md) | Jekyll、Bulma、媒体画廊、章节导航与图表模块候选 |
| 核对版本、资产与许可 | [机器可读目录](../../catalog/justin-sources.json) | 仓库、分支、提交、源码路径、资源缺失与限制 |

详细接口见 [Three.js 模块说明](three-robot-demos.md) 与 [Viser 构建方法](viser.md)。

## 本地启动归档页面

在已配置归档目录的机器上，从仓库根目录运行：

```bash
python3 scripts/serve-reference-library.py
# http://127.0.0.1:4190/
```

默认读取不提交到 Git 的 `local-library/justin-yu`。迁移到另一台机器后可明确指定归档：

```bash
python3 scripts/serve-reference-library.py --library /path/to/archive --port 4190
```

服务只读取原始档案，在响应中将已归档的站点资源、跨站 Viser 录制、CDN 脚本和字体指向本地。个人主页使用同时存档的已部署 HTML/CSS 预览，Jekyll 原源码仍保留供改造。支持视频 Range 请求。原站未提供的文件、Google Drive 视频、远端 API 等仍按目录记录的边界处理；并非承诺原站全部外部服务都可离线使用。

## 复用流程

1. 选取页面或模块，查阅目录中的 `coreFiles`、固定提交和许可证据。
2. 从保留的原始档案复制到新的项目工作目录；保持原始档案不变。
3. 替换作者、论文、实验结果、图片、视频和轨迹；保留应保留的许可证与致谢。
4. 需要机器人实验场景时，优先用 Python / Viser 导出自己的 `.viser` 录制；特殊页面动效再选 Three.js。
5. 检查相对资源路径、桌面／手机交互、减弱动态偏好，构建后部署。

有些站点的页面模板许可与字体、模型、场景资产的许可不同。目录逐项记录，不以“GitHub 可见”推断整站可重新发布。缺乏明确许可的原站代码仍可在本地研究，公开改造前按目录中的要求取得授权或替换实现与素材。

## 新 Demo 的静态发布

```bash
npm ci
npm run build
npm run preview
npm test
```

Vite 自动发现 `examples/*/index.html`，支持 `/pages/` 子路径。Three.js 库已在现有依赖中；Viser 静态客户端随示例自托管。页面中的轨迹为可重复生成的演示数据，未连接真实机器人，也不在线执行研究模型。
