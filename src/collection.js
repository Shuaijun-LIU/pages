import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./collection.css";
import fieldworkPreview from "../docs/preview-run.png";
import bracePreview from "../docs/preview-brace.png";
import djepaPreview from "../docs/preview-d-jepa.png";
import mimicxPreview from "../docs/preview-mimicx.png";

// Add one entry and an examples/<slug>/index.html page for each new study.
const examples = [
  {
    number: "001",
    name: "FIELDWORK",
    title: "让机器人的动作，成为网页的主角。",
    description:
      "从采摘、持杯到折衣与奔跑，将三维运动转译为方块字符。关节的轨迹、流动的信号和渐隐切换，共同构成一个可交互的动态首页。",
    tags: ["ASCII 动画", "三维交互", "运动拖尾", "明暗主题"],
    path: "./examples/fieldwork/",
    preview: fieldworkPreview,
    previewAlt: "FIELDWORK 机器人奔跑字符动画网站预览",
    reference: "https://www.xdof.ai/",
    referenceName: "xdof.ai",
    type: "交互动效 / MOTION STUDY",
    detail: "4 个动作场景 · 可旋转视角 · 自动轮播",
  },
  {
    number: "002",
    name: "BRACE",
    title: "让研究故事和交互讲解相互补充。",
    description:
      "经典论文项目页串联问题、方法与结果，用独立交互动画拆解重规划流程。蓝色视觉、明暗切换和跨平台演示，让研究内容可以从阅读走向体验。",
    tags: ["论文项目页", "交互讲解", "结果展示", "明暗主题"],
    path: "./examples/brace/",
    preview: bracePreview,
    previewAlt: "BRACE 论文项目网站预览",
    reference: "https://github.com/NEBULIS-Lab/BRACE",
    referenceName: "NEBULIS-Lab / BRACE",
    referenceLabel: "项目来源",
    type: "研究展示 / RESEARCH WEBSITE",
    detail: "论文项目页 · 独立交互动画 · 多平台展示",
    browserLabel: "brace / research & explainer",
    previewBackground: "#e5ebf3",
  },
  {
    number: "003",
    name: "D-JEPA",
    title: "把抽象的模型，变成可探索的过程。",
    description:
      "紫色主题贯穿项目主页与方法讲解，结合动态模型图、步骤演示和实验视频，在研究概览与深入探索之间建立连贯的浏览路径。",
    tags: ["紫色主题", "动态模型图", "交互讲解", "实验视频"],
    path: "./examples/d-jepa/",
    preview: djepaPreview,
    previewAlt: "D-JEPA 紫色主题研究网站预览",
    reference: "https://github.com/NEBULIS-Lab/D-JEPA",
    referenceName: "NEBULIS-Lab / D-JEPA",
    referenceLabel: "项目来源",
    type: "交互研究 / INTERACTIVE RESEARCH",
    detail: "紫色视觉 · 模型讲解 · 视频与数据展示",
    browserLabel: "d-jepa / model & interaction",
    previewBackground: "#ebe1ed",
  },
  {
    number: "004",
    name: "MimicX",
    title: "用大幅动作画面，开启研究叙事。",
    description:
      "以网球动作序列构成全屏主视觉，向下展开动作画廊、视频对比与研究结果。轮播、图片放大和同步播放，让媒体成为页面体验的一部分。",
    tags: ["全屏主视觉", "动作画廊", "视频对比", "图片浏览器"],
    path: "./examples/mimicx/",
    preview: mimicxPreview,
    previewAlt: "MimicX 人形机器人动作项目网站预览",
    reference: "https://github.com/NEBULIS-Lab/MimicX",
    referenceName: "NEBULIS-Lab / MimicX",
    referenceLabel: "项目来源",
    type: "媒体叙事 / MOTION SHOWCASE",
    detail: "全屏主视觉 · 动作轮播 · 同步视频对比",
    browserLabel: "mimicx / motion & scenes",
    previewBackground: "#eee5df",
  },
];

document.querySelectorAll("[data-example-count]").forEach((element) => {
  element.textContent = String(examples.length).padStart(2, "0");
});
document.querySelector("#example-list").innerHTML = examples
  .map(
    (example, index) => `
  <article class="example-card" style="--preview-bg: ${example.previewBackground || "#e7e6f0"}" aria-labelledby="example-${example.number}">
    <a class="example-preview" href="${example.path}" aria-label="预览并进入 ${example.name}">
      <div class="preview-caption"><span class="mono">EXAMPLE / ${example.number}</span><span class="live-badge"><span></span>可交互示例</span></div>
      <div class="browser-preview"><div class="browser-bar" aria-hidden="true"><span class="browser-dots">● ● ●</span><span>${example.browserLabel || "fieldwork / motion studies"}</span><span>↗</span></div><img src="${example.preview}" alt="${example.previewAlt}" width="1440" height="1000" loading="${index === 0 ? "eager" : "lazy"}" fetchpriority="${index === 0 ? "high" : "auto"}" /></div>
      <div class="preview-bottom"><span>${example.detail}</span><span class="preview-arrow" aria-hidden="true">↗</span></div>
    </a>
    <div class="example-info"><p class="example-type mono">${example.type}</p><h3 id="example-${example.number}">${example.name}</h3><p class="example-title">${example.title}</p><p class="example-description">${example.description}</p><ul class="tags" aria-label="示例特点">${example.tags.map((tag) => `<li>${tag}</li>`).join("")}</ul><div class="example-links"><a class="enter-link" href="${example.path}">进入示例 <span aria-hidden="true">↗</span></a><a class="reference-link" href="${example.reference}" target="_blank" rel="noreferrer">${example.referenceLabel || "参考来源"} <span>${example.referenceName} ↗</span></a></div></div>
  </article>
`,
  )
  .join("");
