# Justin Yu 相关网站：源码、交互模块与本地复用

审计日期：2026-10-09。九个页面对应八个网站仓库；Real2Render2Real 的网站源码位于独立网站仓库，研究算法仓库不能代替它。另保存了 Viser v1.0.22 的前端源码。精确分支、完整 commit、核心文件、依赖和授权边界见 [机器可读目录](../../catalog/justin-sources.json)。

原始浅克隆保持未修改；在线部署 HTML、补充媒体、CDN 文件、许可证审计和本地预览分别保存。大型视频和场景放在本地共享资料库，公开图库只提供九个独立参考入口、原站嵌入及打开原站的回退链接。

## 源码地图

| 页面 | 网站源码与目录 | 技术与最有价值的模块 |
|---|---|---|
| [Justin Yu](https://uynitsuj.github.io/) | [uynitsuj/uynitsuj.github.io](https://github.com/uynitsuj/uynitsuj.github.io)，`master`，根目录 | Jekyll/Liquid、YAML、SCSS；主题切换、研究卡片、四个 Viser 录像视窗 |
| [WARP-RM](https://uynitsuj.github.io/warp-rm/) | 同仓库，`warp-rm/` | 原生 HTML/CSS/JS；可交互三维首屏、录像与奖励曲线联动、指标切换条形图、SVG warp 采样器 |
| [EgoMI](https://egocentric-manipulation-interface.github.io/) | [独立网站仓库](https://github.com/egocentric-manipulation-interface/egocentric-manipulation-interface.github.io)，`main` | 视频缩略图切换五个 Viser 录像、折叠摘要、滚动导航 |
| [Real2Render2Real](https://real2render2real.com/) | [real2render2real/real2render2real.github.io](https://github.com/real2render2real/real2render2real.github.io)，`main` | 视频轮播、三维录像切换、成对机器人视窗、BibTeX 复制 |
| [POGS](https://berkeleyautomation.github.io/POGS/) | [BerkeleyAutomation/POGS](https://github.com/BerkeleyAutomation/POGS)，`main` | Bulma/Nerfies 页面、16 场景 Viser 选择器、全屏 |
| [LEGS](https://berkeleyautomation.github.io/LEGS/) | [BerkeleyAutomation/LEGS](https://github.com/BerkeleyAutomation/LEGS)，`main` | Bulma/Nerfies 论文页面、视频与语义查询图；当前页面不是实时三维交互器 |
| [CaP-X](https://capgym.github.io/) | [capgym/capgym.github.io](https://github.com/capgym/capgym.github.io)，`main` | D3 v7、GSAP 3.12.2/ScrollTrigger、Prism；JSON 图表、视频/代码弹窗、任务卡片 |
| [SARM](https://qianzhong-chen.github.io/sarm.github.io/) | [qianzhong-chen/sarm.github.io](https://github.com/qianzhong-chen/sarm.github.io)，`main` | Bulma/jQuery、奖励预测视频与图表分节 |
| [SARM2](https://qianzhong-chen.github.io/sarm2.github.io/) | [qianzhong-chen/sarm2.github.io](https://github.com/qianzhong-chen/sarm2.github.io)，`main` | 同类论文布局、多任务视频/结果区 |

## 三维展示究竟如何工作

这些项目的交互三维视窗使用 Viser 录像回放。网页 iframe 加载已构建的 React/Three.js 客户端，`playbackPath` 参数指定 `.viser` 文件；客户端解压并解析消息，按时间重放场景更新，Three.js 渲染几何与 Gaussian splats。拖拽改变相机，所以它不同于一段平面 MP4；它也不是浏览器中重新执行机器人策略或训练模型。

数据和客户端已完整保存在网站仓库内：

- 个人仓库 `viser-client/`：较早的构建，包含 JS/CSS、WASM 排序器、worker、HDRI；bundle 中可查到 `REVISION="170"` 和 `deserializeGzippedMsgpackFile`，使用 gzip/MessagePack 回放。
- 个人仓库 `viser-client-1.0.22/index.html`：单 HTML 构建。其版本目录名称与另一份版本化源代码关联，但没有把网站修改后的字节错误地宣称为上游原版。
- 个人仓库 `warp-rm/viser/{index.html,client.js,client.css}`：WARP 定制客户端，包含 studio 场景、灯光及相机控制。
- POGS 仓库 `viser-client/`：独立保存的旧版构建，不能随意用 v1.0.22 替换其录像解码器。
- 个人仓库 `recordings/` 有 14 个 `.viser`，POGS 的 `recordings/` 有 16 个；EgoMI 和 R2R2R 的 iframe 指向个人仓库中的共享客户端与录像，单独下载它们自己的 HTML 不够。

可读上游源代码固定为 [Viser v1.0.22，commit 83fb7a7](https://github.com/viser-project/viser/tree/83fb7a7625be545fe2e59e06f297a87705fc7f03/src/viser/client)，采用 Apache-2.0。核心路径：

| 目的 | 源代码 |
|---|---|
| 解析 `playbackPath`、选择文件回放 | `src/viser/client/src/App.tsx`，约 202 行 |
| 下载、zstd/MessagePack 解码、时间轴回放 | `src/viser/client/src/FilePlayback.tsx`，约 26–71 行及 `PlaybackFromFile` |
| 将消息应用到场景 | `src/viser/client/src/MessageHandler.tsx`、`SceneTree.tsx` |
| Gaussian splats 与排序 worker | `src/viser/client/src/Splatting/GaussianSplats.tsx`、`SplatSortWorker.ts`、`WasmSorter/` |
| 前端版本/构建依赖 | `src/viser/client/package.json`、`package-lock.json`、`vite.config.mts` |

该版本的 `package.json` 要求 Node >=24，开发命令为在 `src/viser/client/` 内执行 `npm ci`、`npm run dev`；构建命令是 `npm run build`。这些是源码声明的命令，本次没有安装或构建整个上游依赖树。旧版网站 bundle 使用 gzip，新版上游使用带长度头的 zstd；复用时保留与录像兼容的客户端。

## 重点模块从哪里拆

**个人主页。** 真正入口是 `_layouts/home.html`，根目录 `index.html` 只有 Jekyll frontmatter。`_data/index/demos.yml` 配置三维卡片，`repos.yml`、`projects.yml` 管理资料；`css/main.scss` 编译为部署的 `css/main.css`。`viser-idle-sway.js` 通过 Three.js 观察事件关联渲染器/场景，处理空闲镜头摆动、DPR 与裁剪。部署 HTML 和编译 CSS 已单独保存，便于不安装旧版 Ruby 依赖直接本地看效果。

**WARP-RM 首屏。** `warp-rm/index.html` 约 2198 行开始描述消息协议，约 2255 行的 `loadScene()` 创建 `./viser/index.html` iframe，使用 `/recordings/tshirt_episode.viser`。页面发送 `{source:'xdof-story', type:'play'|'pause'|'seek'|'reset-view'}`，客户端回传 `source:'xdof-viser'` 的加载/ready 状态；代码检查来源 origin 和 iframe window。把父页、定制客户端和录像拆开会破坏这一联动。页面约 888 行另有 [josephines.world](https://www.josephines.world/) 场景署名；这是自托管定制 Viser 场景的署名链接，并非外嵌该网站。

**WARP-RM 结果交互。** 同一 HTML 内 `media/inspector/curves.json` 驱动录像/奖励检查器；约 2371 行开始的 `DATA`/`build` 驱动可切换指标条形图；约 2593 行开始的采样器使用原生 SVG 和 `requestAnimationFrame`。这些模块没有依赖 D3 或 GSAP。

**EgoMI/R2R2R。** 活跃逻辑大量内联在 `index.html`：`iframeSrcs`、缩略图点击事件、主 iframe、轮播箭头。仓库也有 `script.js`、`style.css`、`style_extra.css`，但当前页面主要使用内联实现；不能只拷贝这些外置文件就期待得到现有交互。

**POGS。** `index.html` 的 16 个 iframe、缩略图事件和全屏控制可以连同 `static/css/index.css` 一起分析；原始独立 viewer 资源、HDRI 和录像全部保留。LEGS 则主要适合复用常规论文信息结构。

**CaP-X。** `js/config.js` 管理作者/标题等元数据；`js/charts.js` 通过 `fetch('data/model_data.json')` 加载图表；`js/main.js` 约 146 行开始配置 GSAP，约 268 行开始处理视频弹窗，约 307 行读取 `data-code-src` 对应代码文件，再由 Prism 高亮。因此必须通过 HTTP 服务打开，不能直接依赖 `file://`。

## 授权与可提取模板

| 页面 | 发现的授权 | 本资料库的复用决定 |
|---|---|---|
| Justin Yu / WARP-RM | 根 `LICENSE.txt` 是 MIT，署名为 2015 Renyuan Zou，来源于旧模板；WARP 另有场景署名 | 可研究模板代码；不把继承的模板许可证扩大成肖像、研究媒体、录像、后续第三方场景的通用再发布许可 |
| EgoMI / R2R2R / CaP-X | 固定版本未找到显式网站许可证 | 保存本地学习资料；图库使用原站嵌入/链接；不自动改编或再发布源站页面 |
| POGS / LEGS | README 和网站 footer 明示 CC BY-SA 4.0；仓库另有 Apache-2.0 LICENSE | 可作为有条件的模板候选：保留作者/来源、许可证、修改说明、相同方式共享要求，并保留独立软件许可证 |
| SARM / SARM2 | README 明示网站 CC BY-SA 4.0；根 LICENSE 是 GPL-3.0 | 保留两种声明，不能混为同一许可证；模板候选额外排除商业字体包 |
| Viser 上游 | Apache-2.0 | 可按其许可复用前端模块，保留许可证与适用通知 |

SARM/SARM2 的 `static/fontawesome/css/{fontawesome,brands,light}.css` 文件头明确写着 **Font Awesome Pro 6.5.1 / Commercial License**。网站模板的许可证不替换这个第三方许可。提取目录排除了整个 `static/fontawesome/`，并去掉相应 HTML 引用；新站应替换成许可明确的图标或已有 Font Awesome Free。

本地 `export_licensed_templates.py` 可重复生成四个小型候选目录：`templates/{pogs,legs,sarm,sarm2}/`。每个包含 `index.html`、`static/css/`、`static/js/`、原始 `README.md`/`LICENSE` 和新增 `REUSE.md`。研究媒体与三维录像不复制到候选目录，保留原站 URL；已移除外部分析脚本加载器，并给不存在的 video/slider 元素相关遗留处理器与预加载补上保护；所有修改写入 `REUSE.md`。这些候选并未部署到公开图库。使用前替换作者、文本、图、链接和数据，遵循原站及独立依赖的相应许可。

授权证据：[个人模板 MIT](https://github.com/uynitsuj/uynitsuj.github.io/blob/50690bf91623e744b521735f43dc62f1e7c10ead/LICENSE.txt)、[POGS Website License](https://github.com/BerkeleyAutomation/POGS/blob/498e21f2b1e802e5d890f3757312e6e044284c5e/README.md)、[LEGS Website License](https://github.com/BerkeleyAutomation/LEGS/blob/aed2d1ca8ec52d35f19cc55eeb7c0678f97d1f36/README.md)、[SARM Website License](https://github.com/qianzhong-chen/sarm.github.io/blob/0022018b7ed01c48fe6d8558fe0cfb50b38c34ee/README.md)、[SARM2 Website License](https://github.com/qianzhong-chen/sarm2.github.io/blob/39f829c91a329ce8e6dfa9f8038e79927f675100/README.md)。

## 已恢复与仍有外部依赖的资源

- 八个网站浅克隆均完整检出，`git status --porcelain` 为空，`git lfs pull` 成功，扫描未发现残余 LFS 指针。网站共 1,133 个文件；加上固定的 Viser 前端源码 156 个文件，共约 2.44 GB 已检出内容，不含 Git 历史存储。
- 30 个 `.viser` 录像完整在盘。五个 EgoMI、个人主页四个卡片、WARP 首屏和 POGS 16 个活跃引用均能找到对应文件。
- R2R2R 部署 HTML 与当前 `main/index.html` 不同，已分别保存部署快照、源码和逐行差异；其余七个静态入口与固定版本逐字节一致。R2R2R 当前 Git 缺少 `data/new_s1.mp4` 和 `data/r2r2r_fig_no_bg.png`，但线上部署可以下载：已保存约 35.9 MB MP4 和 455 KB PNG 到独立补充资源目录，没有改写原始仓库。
- R2R2R 的未启用旧 `iframeData` 分支仍有两个 404 录像名：`package_recording_20250507_103622.viser`、`drawer_reversed_demo.viser`。活跃 `main-iframe` 缩略图分支改用实际存在的 `cardboard_box_recording_20250507_103622.viser` 和 `drawer_recording_20250507_104056.viser`。旧名称列在缺失清单中。
- SARM/SARM2 各有三个线上也不存在的 CSS：`static/source_serif_4.css`、`static/source_sans_3.css`、`static/academicons.min.css`。保留原始来源状态，未伪造文件；主站另有可用字体/图标样式回退。
- 48 个直接 CDN CSS/JS/字体资源已保存；Google AJAX jQuery 地址网络不可达，使用官方 `code.jquery.com` 获取相同 3.5.1 版本，并记录替代来源。随后按浏览器审计补齐 Font Awesome Free 5.15.1 的 15 个字体文件（solid/brands/regular，各含五种格式）、官方许可证和 Prism 1.29 Python 语言模块。POGS/LEGS 原站字体 URL 确认 404；使用明确版本的上游字体补充到独立缓存，未改原仓库。连同两个部署补充资源，共保存 67 个外部文件，清单包含 127 个 URL 映射（多个源站 URL 可共用同一字体文件）。
- MathJax 的入口 JS 已保存，但按运行时需求加载的扩展/字体不等于完整离线安装。Font Awesome Kit、分析服务及动态第三方 API 不声明为完整离线镜像。Google Drive 项目视频保留外部播放器链接，没有抓取其视频二进制。普通论文、外站链接和被注释的嵌入不做全网递归复制。

SARM/SARM2 的 `static/js/index.js` 第 71–72 行仍对页面不存在的 `single-task-result-video`、`multi-task-result-video` 直接设置 `playbackRate`，会产生 null 元素错误。这是源站遗留处理器，归档保留原样；原始归档不改动；已提取的四份候选模板对这类 video/slider 处理器补了存在检查。另一个已复现错误位于 `index.html:31` 的 `updateInTheWild()`：它在 `body onload`（SARM 第 100 行、SARM2 第 112 行）调用时读取不存在的 `inthewild-video-menu.value`，抛出 `Cannot read properties of null (reading value)`；这不是插值滑块错误。派生模板已给 `updateInTheWild`、同类 `updateBimanual`/`updateClothes` 的菜单和媒体元素补存在检查。源码完整获取并不表示原站没有运行时错误。

因此这里的“完整”指固定网站 Git 版本的全部已跟踪前端/静态资源、其共享 Viser 依赖以及明确可恢复的部署补充文件；它不表示外部服务均已离线化。

## 本地运行与审计文件

从本项目根目录运行公开的预览辅助脚本：

```bash
python3 scripts/serve-reference-library.py --port 4190
```

本地资料库位置由脚本的参数/默认设置及机器本地 `inventory.json` 记录；这里不将设备路径写进公开文档。预览链接以 `/sites/<slug>/` 组织，九个 slug 见目录 JSON。该脚本负责把原始域名、共享录像、CDN 缓存和 Jekyll 已部署 HTML/CSS 映射到本地；原始克隆不会被重写。脚本参数以 `python3 scripts/serve-reference-library.py --help` 为准。

单独原始静态站可在站点根目录执行 `python3 -m http.server 8000 --bind 127.0.0.1`。WARP 要从个人仓库根目录启动并访问 `/warp-rm/`，否则根路径 `/recordings/` 会失效。个人 Jekyll 网站的源码命令是 `bundle install` 和 `bundle exec jekyll serve --host 127.0.0.1`；本次预览使用已保存的部署 HTML/CSS。

本地审计材料包括 `inventory.json`、`metadata/archive-validation.json`、`metadata/recordings.json`、`metadata/relative-assets.json`、`metadata/external-assets.json`、`metadata/missing-assets-http.json`、各仓库的 GitHub API 元数据和获取日志。公开 JSON 不包含设备专属账户、路径或资源调度信息。
