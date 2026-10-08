import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./style.css";
import { MotionStudy } from "./motion.js";

const $ = (selector) => document.querySelector(selector);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let storedTheme;
try {
  storedTheme = localStorage.getItem("fieldwork-theme");
} catch {
  /* Storage is optional. */
}
document.documentElement.dataset.theme =
  storedTheme ||
  (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const signal = $("#signal-canvas"),
  signalCtx = signal.getContext("2d");
const samples = [];
let lastSample = -1,
  lastLabel = -1;
function drawSignal() {
  const { width, height } = signal.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (
    signal.width !== Math.round(width * dpr) ||
    signal.height !== Math.round(height * dpr)
  ) {
    signal.width = Math.round(width * dpr);
    signal.height = Math.round(height * dpr);
  }
  const colors = getComputedStyle(document.documentElement);
  signalCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  signalCtx.clearRect(0, 0, width, height);
  signalCtx.strokeStyle = colors.getPropertyValue("--line").trim();
  signalCtx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    signalCtx.beginPath();
    signalCtx.moveTo(0, (i * height) / 4);
    signalCtx.lineTo(width, (i * height) / 4);
    signalCtx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    signalCtx.beginPath();
    signalCtx.moveTo((i * width) / 8, 0);
    signalCtx.lineTo((i * width) / 8, height);
    signalCtx.stroke();
  }
  if (samples.length < 2) return;
  signalCtx.strokeStyle = colors.getPropertyValue("--accent").trim();
  signalCtx.lineWidth = 1.5;
  signalCtx.beginPath();
  const latest = samples.at(-1);
  samples.forEach((sample, i) => {
    const x = width * (1 - (latest.time - sample.time) / 8),
      y = height / 2 - sample.velocity * height * 0.8;
    if (!i) signalCtx.moveTo(x, y);
    else signalCtx.lineTo(x, y);
  });
  signalCtx.stroke();
  const x = width - 2,
    y = height / 2 - latest.velocity * height * 0.8;
  signalCtx.fillStyle = colors.getPropertyValue("--accent").trim();
  signalCtx.beginPath();
  signalCtx.arc(x, y, 2.6, 0, Math.PI * 2);
  signalCtx.fill();
}

const study = new MotionStudy($("#scene"), $("#motion-canvas"), (sample) => {
  if (sample.time - lastSample >= 0.05 || sample.time < lastSample) {
    samples.push({ time: sample.time, velocity: sample.velocity });
    while (samples.length > 1 && sample.time - samples[0].time > 8)
      samples.shift();
    lastSample = sample.time;
    drawSignal();
  }
  if (sample.time - lastLabel >= 0.12 || sample.time <= 0.1) {
    $("#velocity").textContent = Math.abs(sample.velocity).toFixed(2);
    $("#coordinate").textContent = [sample.tip.x, sample.tip.y, sample.tip.z]
      .map((v) => v.toFixed(3))
      .join(", ");
    lastLabel = sample.time;
  }
});
new ResizeObserver(drawSignal).observe(signal);

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("#theme-toggle").setAttribute(
    "aria-label",
    `Switch to ${dark ? "light" : "dark"} theme`,
  );
  $('meta[name="theme-color"]').content = dark ? "#101916" : "#edf0ee";
}
syncThemeButton();
$("#theme-toggle").addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("fieldwork-theme", theme);
  } catch {
    /* Private browsing still works. */
  }
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
  $("#status-text").textContent = study.paused
    ? "MOTION STUDY / PAUSED"
    : "LIVE MOTION STUDY";
  document.documentElement.dataset.paused = String(study.paused);
}
syncPauseButton();
$("#pause-toggle").addEventListener("click", () => {
  study.setPaused(!study.paused);
  syncPauseButton();
});
reducedMotion.addEventListener("change", (e) => {
  study.setPaused(e.matches);
  syncPauseButton();
  typeText(copy[study.sceneName]);
});
$("#reset-view").addEventListener("click", () => study.reset());
document.querySelectorAll("[data-view]").forEach((button) =>
  button.addEventListener("click", () => {
    study.setStyle(button.dataset.view);
    document.querySelectorAll("[data-view]").forEach((b) => {
      b.classList.toggle("active", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
  }),
);

const copy = {
  reach: "Small actions. New possibilities.",
  trace: "Every path begins with a question.",
  balance: "A little adjustment. A different world.",
};
let typeTimer;
function typeText(text) {
  clearTimeout(typeTimer);
  $("#typed-accessible").textContent = text;
  if (reducedMotion.matches) {
    $("#typed-text").textContent = text;
    return;
  }
  let i = 0;
  $("#typed-text").textContent = "";
  const tick = () => {
    $("#typed-text").textContent = text.slice(0, ++i);
    if (i < text.length) typeTimer = setTimeout(tick, 37);
  };
  typeTimer = setTimeout(tick, 420);
}
typeText(copy.reach);
document.querySelectorAll("[data-scene]").forEach((button, index) =>
  button.addEventListener("click", () => {
    study.setScene(button.dataset.scene);
    samples.length = 0;
    lastSample = -1;
    lastLabel = -1;
    drawSignal();
    document.querySelectorAll("[data-scene]").forEach((b) => {
      b.classList.toggle("active", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
    $("#experiment-count").textContent = `0${index + 1} / 03`;
    $(".edition").textContent = `NO. 00${index + 1} / 003`;
    typeText(copy[button.dataset.scene]);
  }),
);

const notebook = {
  studio: `<h2 id="dialog-title">A place for<br><em>the next question.</em></h2><p>FIELDWORK is a fictional research studio and a working sketch of an idea: intelligence becomes interesting when it starts to move.</p><p>This little laboratory turns a mechanical gesture into something you can explore. Orbit around it. Follow the trail. Change the experiment. Watch how one small adjustment becomes a different movement.</p><h3>Built from first principles.</h3><p>The robot is assembled from original procedural geometry. Its movement is calculated live, then translated into a field of characters. No recorded footage. No borrowed 3D models. Just light, geometry, and time.</p><p><a href="https://github.com/Shuaijun-LIU/pages" target="_blank" rel="noreferrer">Open the source notebook</a></p>`,
  notes: `<h2 id="dialog-title">Notes from<br><em>the moving world.</em></h2><h3>01 / Reach & return</h3><p>A recurring gesture, never quite the same view. Three articulated joints carry the gripper through a slow reaching cycle. The copper trail remembers where the end effector has been.</p><h3>02 / Trace a possibility</h3><p>Coordinated joint rotations turn a simple oscillation into a spatial loop. Drag the scene to see how one path changes when viewed from another angle.</p><h3>03 / Find a balance</h3><p>The wrist compensates for motion in the joints below it. A simple illustration of coordination: individual parts move while the final orientation remains steady.</p><p>These are designed motion studies. The signal displays the calculated elbow angular velocity, rather than measurements from physical hardware.</p>`,
};
const dialog = $("#info-dialog");
let resumeAfterDialog = false;
document.querySelectorAll("[data-dialog]").forEach((button) =>
  button.addEventListener("click", () => {
    $("#dialog-content").innerHTML = notebook[button.dataset.dialog];
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
  if (resumeAfterDialog && !reducedMotion.matches) study.setPaused(false);
  syncPauseButton();
});
$("#year").textContent = new Date().getFullYear();
