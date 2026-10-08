import * as THREE from "three";
import { SCENES, loadScenes } from "./scenes.js";
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const TAU = Math.PI * 2;

/** Four independently animated subjects with box-character rendering and joint trails. */
export class MotionStudy {
  constructor(host, canvas, onSample) {
    this.host = host;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSample = onSample;
    this.time = 0;
    this.sceneName = "harvest";
    this.style = "ascii";
    this.paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.automatic = !this.paused;
    this.angle = 0.34;
    this.pitch = 0.1;
    this.zoom = 1;
    this.frame = 0;
    this.last = 0;
    this.lastTrail = -1;
    this.trails = [];
    this.dirty = true;
    this.reveal = this.paused ? 1 : 0;
    this.transition = this.paused ? "steady" : "in";
    this.pendingScene = null;
    this.assets = "loading";
    this.age = 0;
    this.previousSignal = null;
    this.speed = 1;
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    this.palette();
    try {
      this.setup3D();
    } catch (error) {
      this.fallback = true;
      this.assets = "fallback";
      console.info("Canvas motion view:", error.message);
    }
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.bindInteraction();
    this.resize();
    document.addEventListener("visibilitychange", () => {
      this.last = 0;
      if (document.hidden) {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
      } else this.schedule();
    });
    document.fonts.ready.then(() => {
      this.dirty = true;
      this.schedule();
    });
    this.schedule();
  }
  palette() {
    this.dark = document.documentElement.dataset.theme === "dark";
    this.ink = this.dark ? "#bbbbc6" : "#292441";
    this.outline = this.dark ? "#88899b" : "#6055b3";
    this.accent = this.dark ? "#5f80de" : "#b154d3";
    this.dirty = true;
    if (this.width) this.schedule();
  }
  setup3D() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.fallback = true;
      this.dirty = true;
      this.schedule();
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.fallback = false;
      this.resize();
    });
    this.sampleCanvas = document.createElement("canvas");
    this.sampleCtx = this.sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-2.5, 5, 3.5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(2, 2, -4);
    this.scene.add(rim);
    loadScenes()
      .then((scenes) => {
        this.subjects = scenes;
        for (const [id, subject] of scenes) {
          subject.root.visible = id === this.sceneName;
          this.scene.add(subject.root);
        }
        this.assets = "ready";
        this.last = 0;
        this.dirty = true;
        this.schedule();
      })
      .catch((error) => {
        this.assets = "fallback";
        this.fallback = true;
        this.dirty = true;
        this.schedule();
        console.info(
          "Model unavailable; using Canvas subjects:",
          error.message,
        );
      });
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    this.width = Math.max(1, Math.round(r.width));
    this.height = Math.max(1, Math.round(r.height));
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cell = this.width < 600 ? 8 : 13;
    this.cols = Math.max(1, Math.floor(this.width / this.cell));
    this.rows = Math.max(1, Math.floor(this.height / this.cell));
    if (this.renderer && !this.fallback) {
      this.renderer.setSize(this.cols, this.rows, false);
      this.sampleCanvas.width = this.cols;
      this.sampleCanvas.height = this.rows;
      this.camera.aspect = this.cols / this.rows;
      this.camera.updateProjectionMatrix();
    }
    this.dirty = true;
    this.schedule();
  }
  bindInteraction() {
    let drag = null;
    this.host.addEventListener("pointerdown", (e) => {
      if (e.target !== this.canvas && e.target !== this.host) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        angle: this.angle,
        pitch: this.pitch,
      };
      this.host.setPointerCapture(e.pointerId);
    });
    this.host.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.angle = drag.angle - (e.clientX - drag.x) * 0.007;
      this.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.004, -0.3, 0.8);
      this.dirty = true;
      this.schedule();
    });
    for (const name of ["pointerup", "pointercancel"])
      this.host.addEventListener(name, () => {
        drag = null;
      });
    this.host.addEventListener(
      "wheel",
      (e) => {
        if (innerWidth < 760) return;
        e.preventDefault();
        this.zoom = clamp(this.zoom + e.deltaY * 0.001, 0.72, 1.6);
        this.dirty = true;
        this.schedule();
      },
      { passive: false },
    );
    this.host.addEventListener("keydown", (e) => {
      const action = {
        ArrowLeft: () => (this.angle -= 0.13),
        ArrowRight: () => (this.angle += 0.13),
        ArrowUp: () => (this.pitch = clamp(this.pitch + 0.08, -0.3, 0.8)),
        ArrowDown: () => (this.pitch = clamp(this.pitch - 0.08, -0.3, 0.8)),
        "+": () => (this.zoom = clamp(this.zoom - 0.1, 0.72, 1.6)),
        "=": () => (this.zoom = clamp(this.zoom - 0.1, 0.72, 1.6)),
        "-": () => (this.zoom = clamp(this.zoom + 0.1, 0.72, 1.6)),
      }[e.key];
      if (action) {
        e.preventDefault();
        action();
        this.dirty = true;
        this.schedule();
      }
    });
  }
  commitScene(name) {
    this.sceneName = name;
    this.time = 0;
    this.age = 0;
    this.lastTrail = -1;
    this.trails = [];
    this.previousSignal = null;
    this.pendingScene = null;
    this.reveal = this.paused ? 1 : 0;
    this.transition = this.paused ? "steady" : "in";
    if (this.subjects)
      for (const [id, subject] of this.subjects)
        subject.root.visible = id === name;
  }
  setScene(name) {
    if (!SCENES.some((s) => s.id === name)) return;
    if (this.paused || this.assets !== "ready") this.commitScene(name);
    else if (name !== this.sceneName) {
      this.pendingScene = name;
      this.transition = "out";
    } else {
      this.pendingScene = null;
      this.transition = "in";
      this.age = 0;
    }
    this.dirty = true;
    this.schedule();
  }
  setAutomatic(enabled) {
    this.automatic = enabled;
    this.age = 0;
    this.dirty = true;
    this.schedule();
  }
  setStyle(style) {
    this.style = style;
    this.dirty = true;
    this.schedule();
  }
  setPaused(paused) {
    this.paused = paused;
    this.last = 0;
    if (paused) {
      if (this.pendingScene) this.commitScene(this.pendingScene);
      this.transition = "steady";
      this.reveal = 1;
    }
    this.dirty = true;
    this.schedule();
  }
  reset() {
    this.angle = 0.34;
    this.pitch = 0.1;
    this.zoom = 1;
    this.dirty = true;
    this.schedule();
  }
  schedule() {
    if (!this.frame && !document.hidden)
      this.frame = requestAnimationFrame(this.tick);
  }
  animateTransition(dt) {
    if (this.transition === "out") {
      this.reveal = Math.max(0, this.reveal - dt / 0.7);
      if (this.reveal <= 0)
        this.commitScene(this.pendingScene || this.sceneName);
    } else if (this.transition === "in") {
      this.reveal = Math.min(1, this.reveal + dt / 0.9);
      if (this.reveal >= 1) this.transition = "steady";
    } else if (this.automatic && this.age >= 7.3) {
      const index = SCENES.findIndex((s) => s.id === this.sceneName);
      this.pendingScene = SCENES[(index + 1) % SCENES.length].id;
      this.transition = "out";
    }
  }
  glyph(x, y, brightness, opacity = 1) {
    const c = this.ctx,
      s = this.cell * 0.57,
      level = clamp(1 - brightness, 0, 1);
    c.globalAlpha = opacity;
    c.lineWidth = 0.6;
    if (this.style === "points") {
      c.fillStyle = this.ink;
      c.beginPath();
      c.arc(x, y, 1 + level * s * 0.36, 0, TAU);
      c.fill();
      return;
    }
    c.strokeStyle = this.outline;
    c.fillStyle = this.ink;
    if (level < 0.24) {
      c.strokeRect(x - s / 2, y - s / 2, s, s);
    } else if (level < 0.45) {
      c.strokeRect(x - s / 2, y - s / 2, s, s);
      c.fillRect(x - s * 0.29, y - s * 0.29, s * 0.58, s * 0.58);
    } else if (level < 0.68) {
      c.fillRect(x - s / 2, y - s / 2, s, s);
      c.clearRect(x - s * 0.24, y - s * 0.26, s * 0.24, s * 0.38);
    } else {
      c.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }
  draw3D() {
    const subject = this.subjects.get(this.sceneName),
      config = SCENES.find((s) => s.id === this.sceneName);
    const signals = subject.update(this.time);
    // Fit wide dual-arm/table subjects on narrow screens without clipping.
    const narrow = this.width / this.height < 0.8;
    const distance = config.distance * this.zoom * (narrow ? 1.36 : 1);
    const turn =
      this.angle +
      (this.sceneName === "run"
        ? 0.38
        : this.sceneName === "fold"
          ? -0.34
          : 0) +
      Math.sin(this.time * 0.18) * 0.1;
    this.camera.position.set(
      Math.sin(turn) * distance,
      config.center[1] + Math.sin(this.pitch) * distance,
      Math.cos(turn) * distance,
    );
    this.camera.lookAt(...config.center);
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld(true);
    if (!this.paused && this.time - this.lastTrail >= 0.065) {
      subject.trackers.forEach((node, i) => {
        const history = this.trails[i] || (this.trails[i] = []);
        history.push(node.getWorldPosition(new THREE.Vector3()));
        if (history.length > 58) history.shift();
      });
      this.lastTrail = this.time;
    }
    this.drawTrails();
    this.renderer.render(this.scene, this.camera);
    this.sampleCtx.clearRect(0, 0, this.cols, this.rows);
    this.sampleCtx.drawImage(this.renderer.domElement, 0, 0);
    const pixels = this.sampleCtx.getImageData(0, 0, this.cols, this.rows).data;
    const stepX = this.width / this.cols,
      stepY = this.height / this.rows;
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const i = (y * this.cols + x) * 4;
        if (pixels[i + 3] < 30) continue;
        const noise = ((x * 71 + y * 113 + x * y * 7) % 199) / 199;
        if (noise > this.reveal) continue;
        const brightness =
          (pixels[i] * 0.21 + pixels[i + 1] * 0.72 + pixels[i + 2] * 0.07) /
          255;
        this.glyph((x + 0.5) * stepX, (y + 0.5) * stepY, brightness, 0.95);
      }
    this.ctx.globalAlpha = 1;
    const tip = subject.trackers[0].getWorldPosition(new THREE.Vector3());
    this.sample(signals, tip);
    this.updateAxes();
  }
  drawTrails() {
    const c = this.ctx;
    c.save();
    c.strokeStyle = this.accent;
    c.fillStyle = this.accent;
    for (const history of this.trails) {
      if (history.length < 2) continue;
      let previous = null;
      history.forEach((point, i) => {
        const p = point.clone().project(this.camera),
          x = ((p.x + 1) * this.width) / 2,
          y = ((1 - p.y) * this.height) / 2;
        const fade = i / history.length;
        c.globalAlpha = fade * 0.55 * this.reveal;
        if (previous) {
          c.lineWidth = 0.65;
          c.beginPath();
          c.moveTo(previous[0], previous[1]);
          c.lineTo(x, y);
          c.stroke();
        }
        if (i % 3 === 0) {
          c.globalAlpha = fade * 0.8 * this.reveal;
          c.fillRect(Math.round(x / 5) * 5, Math.round(y / 5) * 5, 2, 2);
        }
        previous = [x, y];
      });
    }
    c.restore();
  }
  updateAxes() {
    const q = this.camera.quaternion.clone().invert();
    [
      ["x", new THREE.Vector3(1, 0, 0)],
      ["y", new THREE.Vector3(0, 1, 0)],
      ["z", new THREE.Vector3(0, 0, 1)],
    ].forEach(([id, v]) => {
      v.applyQuaternion(q);
      const line = document.querySelector(`#axis-${id}`),
        label = document.querySelector(`#axis-label-${id}`);
      if (line) {
        line.setAttribute("x2", 30 + v.x * 17);
        line.setAttribute("y2", 30 - v.y * 17);
        label.setAttribute("x", 30 + v.x * 23);
        label.setAttribute("y", 33 - v.y * 23);
      }
    });
  }
  drawFallback() {
    const w = this.width,
      h = this.height,
      c = this.ctx,
      t = this.time,
      scale = Math.min(w * 0.54, h * 0.7) * 0.72;
    const cx = w * 0.5,
      cy = h * 0.53;
    c.save();
    c.translate(cx, cy);
    c.rotate((this.angle - 0.34) * 0.35);
    c.scale(1 / this.zoom, Math.cos(this.pitch - 0.1) / this.zoom);
    c.translate(-cx, -cy);
    const line = (a, b, r) => {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(length / this.cell));
      for (let i = 0; i <= n; i++)
        for (let j = -r; j <= r; j += this.cell) {
          const x = a[0] + ((b[0] - a[0]) * i) / n + j,
            y = a[1] + ((b[1] - a[1]) * i) / n;
          if (
            ((((i * 13 + Math.round(j) * 7) % 31) + 31) % 31) / 31 >
            this.reveal
          )
            continue;
          this.glyph(x, y, 0.3 + ((j + r) / Math.max(r * 2, 1)) * 0.35, 0.9);
        }
    };
    if (this.sceneName === "transfer") {
      for (const side of [-1, 1]) {
        const a = [cx + side * scale * 0.55, cy + scale * 0.25],
          b = [cx + side * scale * 0.45, cy - scale * 0.25],
          d = [cx + side * scale * 0.12, cy + Math.sin(t) * scale * 0.1];
        line(a, b, scale * 0.045);
        line(b, d, scale * 0.045);
      }
      line([cx, cy - scale * 0.03], [cx, cy + scale * 0.12], scale * 0.085);
    } else {
      line([cx, cy - scale * 0.64], [cx, cy - scale * 0.44], scale * 0.11);
      line([cx, cy - scale * 0.37], [cx, cy + scale * 0.08], scale * 0.18);
      for (const side of [-1, 1]) {
        const run = this.sceneName === "run",
          swing = run
            ? Math.sin(t * 5.8 + (side < 0 ? 0 : Math.PI))
            : Math.sin(t * 0.8) * 0.5;
        const shoulder = [cx + side * scale * 0.2, cy - scale * 0.3];
        const elbow = [
          cx + side * scale * (0.29 + swing * 0.07),
          cy - scale * 0.06,
        ];
        const hand =
          this.sceneName === "harvest" && side > 0
            ? [cx + scale * 0.5, cy - scale * (0.28 + 0.15 * Math.sin(t))]
            : [
                cx + side * scale * 0.22,
                cy + scale * 0.14 - swing * scale * 0.15,
              ];
        line(shoulder, elbow, scale * 0.055);
        line(elbow, hand, scale * 0.055);
        line(
          [cx + side * scale * 0.11, cy + scale * 0.08],
          [cx + side * scale * 0.18 + swing * scale * 0.2, cy + scale * 0.65],
          scale * 0.07,
        );
      }
      if (this.sceneName === "fold") {
        line(
          [cx - scale * 0.6, cy + scale * 0.2],
          [cx + scale * 0.6, cy + scale * 0.2],
          scale * 0.02,
        );
      }
    }
    c.restore();
    c.globalAlpha = 1;
    this.sample([Math.sin(t), Math.cos(t), Math.sin(t * 0.5)], {
      x: 0,
      y: 0,
      z: 0,
    });
  }
  sample(signals, tip) {
    const previous = this.previousSignal,
      dt = previous ? this.time - previous.time : 0;
    const velocity =
      dt > 1e-5 ? (signals[0] - previous.angle) / dt : previous?.velocity || 0;
    const acceleration =
      dt > 1e-5 ? (velocity - (previous?.velocity || 0)) / dt : 0;
    if (dt > 1e-5 || !previous)
      this.previousSignal = { time: this.time, angle: signals[0], velocity };
    this.onSample?.({
      time: this.time,
      velocity,
      acceleration,
      angle: signals[0],
      phase: signals[2],
      tip,
      scene: this.sceneName,
      progress: this.age / 8,
      transition: this.transition,
      renderer: this.fallback ? "canvas" : "webgl",
    });
  }
  tick(now) {
    this.frame = 0;
    if (document.hidden) return;
    if (this.last && now - this.last < 32 && !this.dirty) {
      this.schedule();
      return;
    }
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.12) : 0.032;
    this.last = now;
    if (!this.paused && this.assets !== "loading") {
      this.time += dt;
      this.age += dt;
      this.animateTransition(dt);
    }
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (!this.fallback && this.subjects) this.draw3D();
    else if (this.assets !== "loading") this.drawFallback();
    this.canvas.dataset.renderer = this.fallback ? "canvas" : "webgl";
    this.canvas.dataset.assets = this.assets;
    this.canvas.dataset.time = this.time.toFixed(3);
    this.canvas.dataset.scene = this.sceneName;
    this.canvas.dataset.transition = this.transition;
    document
      .querySelector("#scene-loading")
      .classList.toggle("loaded", this.assets !== "loading");
    document.querySelector("#render-note").hidden = !this.fallback;
    document.querySelector(".scene-hint").textContent = this.fallback
      ? "2D view · Drag to tilt · Scroll to zoom"
      : "Drag to orbit · Scroll to zoom";
    this.dirty = false;
    if (!this.paused || this.assets === "loading") this.schedule();
  }
}
