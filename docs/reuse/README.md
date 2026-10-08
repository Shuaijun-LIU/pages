# 机器人项目网站复用库

集锦现有 16 个入口：原有 4 个项目、3 个自有机器人 3D Demo、Justin Yu 及相关工作的 9 个参考页面。参考页面保留作者原站；完整源码与大体积媒体归档在本地，在线集锦通过原站嵌入展示，并提供直接打开原站的入口。三个新 Demo 的模型、代码、轨迹和 Viewer 自托管，不依赖参考站或在线 Python 后端。

## 从哪里开始

| 目标 | 优先入口 | 可直接复用的部分 |
| --- | --- | --- |
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
4. 需要机器人场景时，接入本仓库的 Three.js 模块，或用 Python 导出自己的 `.viser` 录制。
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
