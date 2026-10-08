import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./collection.css";
import fieldworkPreview from "../docs/preview-run.png";

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
];

document.querySelectorAll("[data-example-count]").forEach((element) => {
  element.textContent = String(examples.length).padStart(2, "0");
});
document.querySelector("#example-list").innerHTML = examples
  .map(
    (example) => `
  <article class="example-card" aria-labelledby="example-${example.number}">
    <a class="example-preview" href="${example.path}" aria-label="预览并进入 ${example.name}">
      <div class="preview-caption"><span class="mono">EXAMPLE / ${example.number}</span><span class="live-badge"><span></span>可交互示例</span></div>
      <div class="browser-preview"><div class="browser-bar" aria-hidden="true"><span class="browser-dots">● ● ●</span><span>${example.name.toLowerCase()} / motion studies</span><span>↗</span></div><img src="${example.preview}" alt="${example.previewAlt}" width="1440" height="1000" fetchpriority="high" /></div>
      <div class="preview-bottom"><span>${example.detail}</span><span class="preview-arrow" aria-hidden="true">↗</span></div>
    </a>
    <div class="example-info"><p class="example-type mono">${example.type}</p><h3 id="example-${example.number}">${example.name}</h3><p class="example-title">${example.title}</p><p class="example-description">${example.description}</p><ul class="tags" aria-label="示例特点">${example.tags.map((tag) => `<li>${tag}</li>`).join("")}</ul><div class="example-links"><a class="enter-link" href="${example.path}">进入示例 <span aria-hidden="true">↗</span></a><a class="reference-link" href="${example.reference}" target="_blank" rel="noreferrer">参考来源 <span>${example.referenceName} ↗</span></a></div></div>
  </article>
`,
  )
  .join("");
