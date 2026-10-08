import "@fontsource-variable/dm-sans";
import "./reference-viewer.css";
import { referenceSites } from "./reference-sites.js";

const site = referenceSites.find(
  (item) => item.slug === document.body.dataset.reference,
);
const zh = (() => {
  try {
    return localStorage.getItem("collection-language") === "zh";
  } catch {
    return false;
  }
})();
document.documentElement.lang = zh ? "zh-CN" : "en";
document.title = `${site.name} — Website collection`;
document.querySelector("#reference-name").textContent = site.name;
const original = document.querySelector("#original-link");
original.href = site.url;
original.textContent = zh ? "打开原站 ↗" : "Open original ↗";
document.querySelector("#back-link").textContent = zh
  ? "← 集锦"
  : "← Collection";
document.querySelector("#reference-note").textContent = zh
  ? "此处展示作者原站，需要网络连接。若嵌入页面无法加载，可点击“打开原站”。"
  : "This view loads the author’s original website and needs a network connection. If it cannot load, use Open original.";
const frame = document.querySelector("#reference-frame");
frame.title = `${site.name} original website`;
// Only trusted, fixed catalog URLs are embedded; no user-supplied URL parameters.
frame.src = site.url;
document.querySelector("#reference-note-toggle").textContent = zh
  ? "页面说明"
  : "About this view";
