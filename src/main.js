import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./style.css";
import { MotionStudy } from "./motion.js";
import { SCENES } from "./scenes.js";
const $ = (selector) => document.querySelector(selector);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let storedTheme;
try {
  storedTheme = localStorage.getItem("fieldwork-theme");
} catch {
  /* Optional storage. */
}
document.documentElement.dataset.theme = ["dark", "light"].includes(storedTheme)
  ? storedTheme
  : matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
let typeTimer;
function typeText(config) {
  clearTimeout(typeTimer);
  $("#headline-accessible").textContent = config.headline;
  $("#typed-accessible").textContent = config.line;
  $("#headline-text").textContent = "";
  $("#typed-text").textContent = "";
  $("#headline-cursor").hidden = false;
  $("#subline-cursor").hidden = true;
  if (reducedMotion.matches) {
    $("#headline-text").textContent = config.headline;
    $("#typed-text").textContent = config.line;
    $("#headline-cursor").hidden = true;
    return;
  }
  let i = 0,
    j = 0;
  const tick = () => {
    if (i < config.headline.length) {
      $("#headline-text").textContent = config.headline.slice(0, ++i);
      typeTimer = setTimeout(tick, 43);
    } else {
      $("#headline-cursor").hidden = true;
      $("#subline-cursor").hidden = false;
      $("#typed-text").textContent = config.line.slice(0, ++j);
      if (j < config.line.length) typeTimer = setTimeout(tick, 25);
    }
  };
  typeTimer = setTimeout(tick, 150);
}
const signal = $("#signal-canvas"),
  context = signal.getContext("2d");
const samples = [];
let lastSample = -1,
  lastScene = "harvest";
function drawSignal() {
  const { width, height } = signal.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  if (
    signal.width !== Math.round(width * dpr) ||
    signal.height !== Math.round(height * dpr)
  ) {
    signal.width = Math.round(width * dpr);
    signal.height = Math.round(height * dpr);
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  const dark = document.documentElement.dataset.theme === "dark";
  context.strokeStyle = dark ? "#77718b25" : "#8571ab18";
  context.lineWidth = 0.5;
  for (let i = 1; i < 4; i++) {
    context.beginPath();
    context.moveTo(0, (height * i) / 4);
    context.lineTo(width, (height * i) / 4);
    context.stroke();
  }
  const colors = dark
    ? ["#b86a99", "#698cda", "#9880d6", "#4d9e8c"]
    : ["#ee91cc", "#7aace7", "#b09bec", "#69cec0"];
  const fields = ["angle", "velocity", "acceleration", "phase"];
  const divisor = [Math.PI, 3, 20, 1];
  fields.forEach((field, index) => {
    context.strokeStyle = colors[index];
    context.lineWidth = 1.7;
    context.beginPath();
    if (samples.length < 2) {
      context.moveTo(0, height * 0.8);
      context.lineTo(width, height * 0.8);
    }
    const now = samples.at(-1)?.time || 0;
    samples.forEach((sample, i) => {
      const x = width * (1 - (now - sample.time) / 8);
      const normalized = Math.max(
        0,
        Math.min(1, Math.abs(sample[field]) / divisor[index]),
      );
      const y = height - 8 - normalized * (height - 16);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  });
}
function syncScene(id) {
  const index = SCENES.findIndex((s) => s.id === id),
    config = SCENES[index];
  document.querySelectorAll("[data-scene]").forEach((b) => {
    const selected = b.dataset.scene === id;
    b.classList.toggle("active", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  $("#experiment-count").textContent = `0${index + 1} / 04`;
  $("#motion-canvas").setAttribute(
    "aria-label",
    `${config.label}: live character-rendered robot motion`,
  );
  typeText(config);
  samples.length = 0;
  lastSample = -1;
  lastScene = id;
}
const study = new MotionStudy($("#scene"), $("#motion-canvas"), (sample) => {
  if (sample.scene !== lastScene) syncScene(sample.scene);
  if (sample.time - lastSample >= 0.06 || sample.time < lastSample) {
    samples.push(sample);
    while (samples.length > 1 && sample.time - samples[0].time > 8)
      samples.shift();
    lastSample = sample.time;
    drawSignal();
  }
  $("#cycle-progress").style.width =
    `${study.automatic ? Math.min(100, sample.progress * 100) : 0}%`;
  $("#status-text").textContent = study.paused
    ? "PAUSED"
    : sample.transition === "out"
      ? "TRANSITION"
      : "PLAYING";
});
new ResizeObserver(drawSignal).observe(signal);
syncScene("harvest");
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("#theme-toggle").setAttribute(
    "aria-label",
    `Switch to ${dark ? "light" : "dark"} theme`,
  );
  $(".theme-thumb").textContent = dark ? "☾" : "☼";
  $('meta[name="theme-color"]').content = dark ? "#0a0a0c" : "#f0edf9";
}
syncThemeButton();
$("#theme-toggle").addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("fieldwork-theme", theme);
  } catch {}
  syncThemeButton();
  study.palette();
  drawSignal();
});
function syncPauseButton() {
  $("#pause-toggle").setAttribute("aria-pressed", String(study.paused));
  $("#pause-toggle").setAttribute(
    "aria-label",
    study.paused ? "Play animation" : "Pause animation",
  );
  $("#pause-label").textContent = study.paused ? "Play" : "Pause";
  $("#pause-icon").textContent = study.paused ? "▷" : "Ⅱ";
  $("#status-text").textContent = study.paused ? "PAUSED" : "PLAYING";
}
function syncAutoButton() {
  const b = $("#autoplay-toggle");
  b.setAttribute("aria-pressed", String(study.automatic));
  b.setAttribute(
    "aria-label",
    study.automatic
      ? "Disable automatic scene switching"
      : "Enable automatic scene switching",
  );
}
syncPauseButton();
syncAutoButton();
$("#pause-toggle").addEventListener("click", () => {
  study.setPaused(!study.paused);
  syncPauseButton();
});
$("#autoplay-toggle").addEventListener("click", () => {
  study.setAutomatic(!study.automatic);
  syncAutoButton();
});
$("#reset-view").addEventListener("click", () => study.reset());
reducedMotion.addEventListener("change", (e) => {
  study.setPaused(e.matches);
  if (e.matches) {
    study.setAutomatic(false);
    resumeAfterDialog = false;
  }
  syncPauseButton();
  syncAutoButton();
  typeText(SCENES.find((s) => s.id === study.sceneName));
});
document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    study.setStyle(b.dataset.view);
    document.querySelectorAll("[data-view]").forEach((other) => {
      other.classList.toggle("active", other === b);
      other.setAttribute("aria-pressed", String(other === b));
    });
  }),
);
document
  .querySelectorAll("[data-scene]")
  .forEach((b) =>
    b.addEventListener("click", () => study.setScene(b.dataset.scene)),
  );
const notebook = {
  studio: `<h2 id="dialog-title">Movement gives an idea a shape.</h2><p>FIELDWORK is a fictional studio and an open notebook of machine movement. These studies look at simple gestures: reaching for an object, handling a cup, folding fabric, and moving a whole body.</p><p>Each scene is rendered live. What you see is a three-dimensional model translated into a field of small characters. The colored trails remember the paths of its joints.</p><p>Drag a scene to look around it. Switch between characters and points. Pause at a moment that catches your eye.</p>`,
  notes: `<h2 id="dialog-title">Four studies. Four kinds of coordination.</h2><h3>01 / Harvest</h3><p>A complete humanoid reaches toward a small object, brings it inward, and returns. Its articulated shoulders and elbows coordinate the gesture.</p><h3>02 / Transfer</h3><p>Two independent grippers move around a cup. The arms move together as the object lifts and tilts.</p><h3>03 / Fold</h3><p>A humanoid works at a table. Both arms follow a piece of fabric as its surface bends into a fold.</p><h3>04 / Run</h3><p>Alternating strides and opposing arm swings create a continuous running cycle. Follow the wrist and ankle trails to see its rhythm.</p><p>The movements are authored visual studies, not recorded robot experiments. The four normalized traces show joint angle, angular velocity, angular acceleration, and a scene motion signal.</p>`,
  credits: `<h2 id="dialog-title">Made to be explored.</h2><p>Website, writing, motion choreography, dual-arm geometry, props, and character rendering were created for FIELDWORK.</p><p>The humanoid geometry is adapted from the Unitree G1 model in Google DeepMind’s MuJoCo Menagerie, under its BSD-3-Clause license. Its mesh has been simplified for this display; brand geometry is omitted.</p><p><a href="./licenses/Unitree-G1-BSD.txt" target="_blank" rel="noreferrer">Robot model license</a> · <a href="https://github.com/Shuaijun-LIU/pages/blob/main/THIRD_PARTY.md" target="_blank" rel="noreferrer">Libraries and fonts</a></p><p><a href="https://github.com/Shuaijun-LIU/pages" target="_blank" rel="noreferrer">Explore the source</a></p>`,
};
const dialog = $("#info-dialog");
let resumeAfterDialog = false;
document.querySelectorAll("[data-dialog]").forEach((b) =>
  b.addEventListener("click", () => {
    $("#dialog-content").innerHTML = notebook[b.dataset.dialog];
    resumeAfterDialog = !study.paused;
    study.setPaused(true);
    syncPauseButton();
    dialog.showModal();
  }),
);
$("#close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
dialog.addEventListener("close", () => {
  if (resumeAfterDialog) study.setPaused(false);
  syncPauseButton();
});
$("#year").textContent = new Date().getFullYear();
