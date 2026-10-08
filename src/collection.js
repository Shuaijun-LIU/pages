import "@fontsource-variable/dm-sans";
import "./collection.css";
import fieldworkPreview from "../docs/preview-run.png";
import bracePreview from "../docs/preview-brace.png";
import djepaPreview from "../docs/preview-d-jepa.png";
import mimicxPreview from "../docs/preview-mimicx.png";

// Keep each collection entry concise and provide both languages.
const examples = [
  {
    name: "FIELDWORK",
    slug: "fieldwork",
    preview: fieldworkPreview,
    background: "#e7e6f0",
    description: {
      en: "Four robot movements, rendered as interactive ASCII animation.",
      zh: "用可交互的 ASCII 动画，呈现四种机器人动作。",
    },
    tags: {
      en: [
        "ASCII animation",
        "3D interaction",
        "Motion trails",
        "Light & dark",
      ],
      zh: ["ASCII 动画", "三维交互", "运动拖尾", "明暗主题"],
    },
  },
  {
    name: "BRACE",
    slug: "brace",
    preview: bracePreview,
    background: "#e5ebf3",
    description: {
      en: "A research page with an interactive guide to budgeted replanning.",
      zh: "论文项目页，配合预算约束重规划的交互讲解。",
    },
    tags: {
      en: ["Research page", "Interactive guide", "Results", "Light & dark"],
      zh: ["论文项目页", "交互讲解", "结果展示", "明暗主题"],
    },
  },
  {
    name: "D-JEPA",
    slug: "d-jepa",
    preview: djepaPreview,
    background: "#ebe1ed",
    description: {
      en: "A world model explained through animated diagrams and experiment videos.",
      zh: "通过动态模型图与实验视频，介绍世界模型。",
    },
    tags: {
      en: ["Purple theme", "Model diagrams", "Interactive guide", "Video"],
      zh: ["紫色主题", "动态模型图", "交互讲解", "实验视频"],
    },
  },
  {
    name: "MimicX",
    slug: "mimicx",
    preview: mimicxPreview,
    background: "#eee5df",
    description: {
      en: "Humanoid motion shown through a full-screen hero, galleries and video comparisons.",
      zh: "用全屏主视觉、动作画廊与视频对比，展示人形机器人运动。",
    },
    tags: {
      en: [
        "Full-screen hero",
        "Motion gallery",
        "Video comparison",
        "Image viewer",
      ],
      zh: ["全屏主视觉", "动作画廊", "视频对比", "图片浏览器"],
    },
  },
];

const copy = {
  en: {
    titleFirst: "Website",
    titleSecond: "collection",
    intro: "Research pages and interactive demos, collected in one place.",
    projects: "Projects",
    skip: "Skip to projects",
    backTop: "Back to top ↑",
    open: "Open website",
    preview: (name) => `${name} website preview`,
    enter: (name) => `Open ${name}`,
    home: "Collection home",
    navigation: "Main navigation",
    language: "Language",
    tags: "Features",
    pageTitle: "Website collection — Shuaijun",
    meta: "A collection of research websites and interactive demos by Shuaijun.",
  },
  zh: {
    titleFirst: "项目网站",
    titleSecond: "参考集锦",
    intro: "收录项目网站与交互演示，供后续设计参考。",
    projects: "项目",
    skip: "跳至项目",
    backTop: "回到顶部 ↑",
    open: "进入示例",
    preview: (name) => `${name} 网站预览`,
    enter: (name) => `进入 ${name}`,
    home: "集锦首页",
    navigation: "主导航",
    language: "语言",
    tags: "特点",
    pageTitle: "项目网站参考集锦 — Shuaijun",
    meta: "Shuaijun 的项目网站参考集锦，收录研究项目页面与交互演示。",
  },
};

function render(language) {
  const text = copy[language];
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = text.pageTitle;
  document.querySelector('meta[name="description"]').content = text.meta;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = text[element.dataset.i18n];
  });
  document
    .querySelector(".collection-brand")
    .setAttribute("aria-label", text.home);
  document
    .querySelector(".collection-header nav")
    .setAttribute("aria-label", text.navigation);
  document
    .querySelector(".language-switcher")
    .setAttribute("aria-label", text.language);
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.language === language),
    );
  });
  document.querySelector("[data-example-count]").textContent = String(
    examples.length,
  ).padStart(2, "0");
  document.querySelector("#example-list").innerHTML = examples
    .map(
      (example, index) => `
    <article class="example-card" style="--preview-bg:${example.background}" aria-labelledby="example-${example.slug}">
      <a class="example-preview" href="./examples/${example.slug}/" aria-label="${text.enter(example.name)}">
        <img src="${example.preview}" alt="${text.preview(example.name)}" width="1440" height="1000" loading="${index === 0 ? "eager" : "lazy"}" fetchpriority="${index === 0 ? "high" : "auto"}" />
      </a>
      <div class="example-info">
        <h3 id="example-${example.slug}">${example.name}</h3>
        <p>${example.description[language]}</p>
        <ul class="tags" aria-label="${text.tags}">${example.tags[language].map((tag) => `<li>${tag}</li>`).join("")}</ul>
        <a class="enter-link" href="./examples/${example.slug}/">${text.open}<span aria-hidden="true">↗</span></a>
      </div>
    </article>
  `,
    )
    .join("");
}

let language = "en";
try {
  const saved = localStorage.getItem("collection-language");
  if (saved === "en" || saved === "zh") language = saved;
} catch {
  /* The collection also works without browser storage. */
}
render(language);
document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => {
    language = button.dataset.language;
    try {
      localStorage.setItem("collection-language", language);
    } catch {
      /* Optional preference. */
    }
    render(language);
  });
});
