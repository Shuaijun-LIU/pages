import "@fontsource-variable/dm-sans";
import "./example-group.css";
import { exampleGroups } from "./example-groups.js";

const group = exampleGroups.find(item => item.slug === document.body.dataset.group);
const zh = (() => {
  try { return localStorage.getItem("collection-language") === "zh"; }
  catch { return false; }
})();
document.documentElement.lang = zh ? "zh-CN" : "en";
document.querySelector("#back-link").textContent = zh ? "← 集锦" : "← Collection";
const open = document.querySelector("#open-view");
open.textContent = zh ? "独立打开 ↗" : "Open view ↗";
const tabs = document.querySelector(".view-tabs");
tabs.setAttribute("aria-label", zh ? "切换示例" : "Choose a view");
let frame = document.querySelector("#example-frame");
const panel = document.querySelector("#view-panel");
let active;
group.views.forEach((view, index) => {
  const button = document.createElement("button");
  button.id = `tab-${view.id}`;
  button.type = "button";
  button.role = "tab";
  button.textContent = view.name;
  button.setAttribute("aria-controls", "view-panel");
  button.addEventListener("click", () => { location.hash = view.id; });
  button.addEventListener("keydown", event => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % group.views.length;
    if (event.key === "ArrowLeft") next = (index - 1 + group.views.length) % group.views.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = group.views.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    tabs.children[next].focus();
    location.hash = group.views[next].id;
  });
  tabs.append(button);
});
function selectView() {
  const view = group.views.find(item => `#${item.id}` === location.hash) || group.views[0];
  if (active === view.id) return;
  active = view.id;
  const url = new URL(view.url, location.href);
  open.href = url.href;
  panel.setAttribute("aria-labelledby", `tab-${view.id}`);
  for (const button of tabs.children) {
    const selected = button.id === `tab-${view.id}`;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
  // A fresh browsing context avoids extra iframe history entries and releases
  // the previous renderer. The parent hash is the only history entry per tab.
  const nextFrame = frame.cloneNode(false);
  nextFrame.title = view.name;
  nextFrame.src = url.href;
  nextFrame.addEventListener("load", prepareEmbeddedView);
  frame.replaceWith(nextFrame);
  frame = nextFrame;
}
function prepareEmbeddedView(event) {
  const frame = event.currentTarget;
  if (new URL(frame.src).origin !== location.origin) return;
  const doc = frame.contentDocument;
  const style = doc.createElement("style");
  // The shared collection header replaces each self-hosted demo's standalone nav.
  style.textContent = `
    body > header { display:none !important; }
    .intro { padding-top:24px; padding-bottom:24px; }
    .intro h1 { font-size:44px; }
    .intro .eyebrow { display:none; }
    .viewer { height:clamp(430px,65vh,620px); }
  `;
  doc.head.append(style);
}
window.addEventListener("hashchange", selectView);
selectView();
