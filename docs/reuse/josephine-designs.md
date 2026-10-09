# Josephine 系列交互参考

检查日期：2026-10-09。新增三个独立入口，现有首页卡片设计、标签和英文默认保持一致。

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
