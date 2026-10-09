# Josephine 系列交互参考

检查日期：2026-10-09。最初新增三个独立入口，现有首页卡片设计、标签和英文默认保持一致。

| 入口 | 原站 | 风格与值得复用的交互 |
| --- | --- | --- |
| Josephine’s World | https://www.josephines.world/ | 浅色无限作品画布、惯性拖拽、居中复位、作品卡片与详情页的图片转场 |
| Synesthesia | https://synesthesia.josephines.world/ | 拟物钢琴和旋钮；音符驱动 Aura、Pixel、Metalheart、Halftone，可叠加视觉层 |
| Pocket Grove | https://pocketgrove.josephines.world/ | 夜间森林、动态光照、雨和流星；摄像头手势映射到场景参数 |

## 为什么选这三个

三者分别提供空间导航、声音与图形联动、沉浸式场景三种交互组织方式，适合补充现有的论文页面和机器人轨迹查看器。ASCII Generator 当前公开入口主要是作品说明与媒体，其方向也与 FIELDWORK 重叠，因此没有再增加一张相似卡片。END OF DAY 的信纸排版值得参考，但这轮优先选择交互更明确的项目。

## 已核对的实现线索

### 可拖拽作品画布

首页的实际部署使用 Next.js / React / Turbopack。DOM 中的 `data-persistent-canvas`、`data-canvas-layer`、`data-canvas-artwork` 分离持久画布、相机偏移与作品内容；`MotionNavigationProvider`、`PortfolioCanvasHost`、`PageRevealProvider` 出现在部署模块中。首页和 `/index` 共用作品数据，详情入口是 `/project/<slug>`。

可复用方向：把每项机器人实验的视频或场景截图放到二维空间；拖拽改变统一容器的平移，放开后衰减速度；点击项目时由当前图片位置平滑过渡到详情图。返回时恢复画布偏移与选中项目。适合实验总览、任务地图和论文补充材料目录。

### 声音驱动的图形与拟物控件

Synesthesia 的部署使用 Next.js / React。应用 chunk `0_r4.t6f85~a0.js` 包含 `AudioContext`、`createAnalyser`、Canvas、`requestAnimationFrame`、音频输入与 MIDI 入口。页面具有原生钢琴键、多个视觉层开关和 PNG / GIF 预览入口。

可复用方向：将声音换成机器人速度、接触力、误差或置信度等时间序列，以颜色、形变、像素密度反馈状态；将互相独立的视觉层保留为可切换的演示参数。音频响应并不表示这些机器人映射已由原站实现。

### 森林场景与手势映射

Pocket Grove 的公开 HTML 使用 Vite 入口及 import map，明确列出 React、Three.js、React Three Fiber、Drei、postprocessing、MediaPipe Tasks Vision；主要应用包为 `assets/index-mekiWq1n.js`。实际部署代码使用 HandLandmarker，模型和 WASM 从外部地址加载。界面将开掌、握拳、距离和挥动映射到亮度、缩放、雨和流星。

可复用方向：沉浸式研究 Demo 的环境灯光、粒子天气和相机运动；可选择将手势替换成鼠标、滑杆或实验时间轴输入。手势模式需要设备摄像头以及浏览器授权。

## 本次交付与复用边界

公开集锦通过原站 iframe 展示，保留“打开原站”和返回导航。Synesthesia 可直接用屏幕钢琴；麦克风仅在用户选择相应输入时请求。Pocket Grove 的摄像头也由原站在用户开始交互后请求。外层页面只向相应站点委派需要的浏览器能力，不替用户授权设备。

已保留一份公开部署 HTML/CSS/JS 快照，供本地核对技术线索，入口为 `local-library/josephine-site-study`。这不是原始源码仓库，也不是完整离线镜像。已检查的作者站点、作品链接和搜索结果未提供可确认的源码仓库或可复用许可证，因此没有将压缩部署代码、作者字体和原始媒体作为开源模板重新发布。后续应复用上述交互结构与成熟基础库，重新组织自有内容与实现。

机器可读索引见 [josephine-sources.json](../../catalog/josephine-sources.json)，包含入口、技术证据、部署文件、浏览器能力与验证范围。

## 运行与检查

```sh
npm ci
npm run dev
# /examples/josephines-world/
# /examples/synesthesia/
# /examples/pocket-grove/
```

原站内容需要网络。CI 使用固定响应验证入口、地址、能力声明、返回导航和布局；原站另在实际浏览器中操作检查。已经实际弹奏屏幕钢琴并切换四种视觉风格；Pocket Grove 验证了森林绘制与进入场景，尚未验证真实摄像头的手势识别效果。


## 第二轮：适合项目网站的三个入口

用户指出最初三个偏交互实验，要求保留并补充适合实际项目主页的例子。本轮以「项目介绍 → 演示 / 方法 → 成果 / 团队」的组织能力筛选。

| 入口 / 原站 | 适合借鉴的结构 | 用在机器人论文网站时 |
| --- | --- | --- |
| [Crater](https://crater.so/) | 暗色光影首屏、简短主张、滚动分段介绍、独立 About / Blog | 首屏放机器人场景或 Viser；用分段内容展开任务、方法和实验 |
| [Inner Space](https://exploreinnerspace.org/) | 全屏影像、科学背景、交互细胞地图、尺度视图、研究团队 | 首页讲问题与研究背景；地图节点组织模块、任务或实验；单独展示交互结果 |
| [Glance](https://www.josephines.world/project/glance) | 浅色双栏简介、项目元信息、演示视频、大幅界面图、项目导航 | 适合短项目和工具：摘要 / 作者 / Paper-Code 链接，随后依次展示核心演示与结果 |

这三者分别是产品落地页、科学项目网站和作品详情页。Glance 不是论文模板；可借鉴其媒体组织方式后补入方法、实验和引用。Orbit、Mecha、Data Journal 使用相同详情框架，本轮未重复收录。Mecha 的机器人视觉是作品媒体，并非可直接拖拽的机器人 Viewer。

### 来源链和实现证据

- **Crater**：Josephine 主页介绍和 Crater 作品链接指向 `crater.so`。部署 HTML 明确加载 React 18、Three.js 0.160.1、GSAP / ScrollTrigger 3.12.5、Lenis 1.1.14；页面自身包含内联场景与交互代码。相关文件为根 `index.html`、`support.js`、`assets/onboarding-captures/onboarding-captures.js`。不要把加载的库直接当成全部效果均已独立提取。
- **Inner Space**：作者介绍里的 XR 链接指向 `exploreinnerspace.org`。HTML 的 `__SAPPER__` 和 `svelte-*` 标记明确表明 Svelte / Sapper；入口包为 `client/client.77ffe08e.js`，首页含视频及研究介绍，`world-in-a-cell/cell` 为节点地图，`world-in-a-cell/scale` 为带滑块的尺度比较。来源链表明作者参与相关工作，不据此推断整站均由她制作。
- **Glance**：作品详情直接位于 Josephine 的 Next.js / React 站点。复用方向是简介、元信息、视频 / 图片序列、前后项目导航；展示媒体中的产品 UI 并不等于网页内实现了整个产品。

### 源码与本地运行

三个入口继续采用原站嵌入。`local-library/josephine-project-pages/` 保存本轮公开部署 HTML/CSS/JS、`manifest.json` 和逐文件 SHA-256；不含完整视频 / 模型镜像。查看结构与实现时先读该档案，可避免重复查找。

Crater 页脚 GitHub 指向 `crater-engineering`，检查时其公开 `crater` 仓库只有 README.md，没有网站前端源码。其余两个站点的已检查链接未确认原始源码仓库。三站均未确认可复用的网站许可证，因此这些是页面结构与交互参考，不冒充可直接搬用的开源模板；可直接复用的机器人结果展示仍选本库自托管 Viser 模块。

```sh
npm run dev
# /examples/crater/
# /examples/inner-space/
# /examples/glance/
```

搭建自己的项目页时，优先选择上述结构，再插入 [Viser 实验结果模块](robot-viewer-choice.md)。替换自己的标题、作者、研究媒体、模型与结果，按需要补充论文 / 代码 / 数据入口。
