import * as THREE from "three";

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Original procedural robot + character renderer. No external models or textures. */
export class MotionStudy {
  constructor(host, canvas, onSample) {
    this.host = host;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSample = onSample;
    this.time = 0;
    this.sceneName = "reach";
    this.style = "ascii";
    this.paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.angle = 0.5;
    this.pitch = 0.24;
    this.zoom = 1;
    this.trail = [];
    this.last = 0;
    this.lastSample = 0;
    this.reveal = 0;
    this.frame = 0;
    this.dirty = true;
    this.tick = this.tick.bind(this);
    this.palette();
    try {
      this.setup3D();
    } catch (error) {
      this.fallback = true;
      document.querySelector("#render-note").hidden = false;
      console.info("Using Canvas motion fallback:", error.message);
    }
    this.resize = this.resize.bind(this);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.bindInteraction();
    this.resize();
    document.addEventListener("visibilitychange", () => {
      this.last = 0;
      if (!document.hidden) this.schedule();
      else {
        cancelAnimationFrame(this.frame);
        this.frame = 0;
      }
    });
    this.schedule();
  }

  palette() {
    this.dark = document.documentElement.dataset.theme === "dark";
    this.ink = this.dark ? "#c2dfb5" : "#234b3a";
    this.dim = this.dark ? "#466b53" : "#9dac96";
    this.accent = this.dark ? "#f2ad7a" : "#bd512e";
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
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.fallback = true;
      this.dirty = true;
      document.querySelector("#render-note").hidden = false;
      this.schedule();
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.fallback = false;
      this.dirty = true;
      document.querySelector("#render-note").hidden = true;
      this.resize();
    });
    this.sampleCanvas = document.createElement("canvas");
    this.sampleCtx = this.sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-3, 7, 5);
    this.scene.add(light);
    const fill = new THREE.DirectionalLight(0xffffff, 1.4);
    fill.position.set(4, 2, -3);
    this.scene.add(fill);
    this.material = new THREE.MeshStandardMaterial({
      color: 0xc4cec9,
      roughness: 0.48,
      metalness: 0.35,
    });
    this.jointMaterial = new THREE.MeshStandardMaterial({
      color: 0x52625b,
      roughness: 0.5,
      metalness: 0.6,
    });
    this.orangeMaterial = new THREE.MeshStandardMaterial({
      color: 0xfa7b40,
      roughness: 0.5,
    });
    this.robot = new THREE.Group();
    this.robot.position.set(-0.35, -0.7, 0);
    this.scene.add(this.robot);
    this.cylinder(this.robot, 0.55, 0.64, 0.13, 0, 0, 0);
    this.cylinder(this.robot, 0.39, 0.43, 0.17, 0, 0.14, 0, this.jointMaterial);
    this.cylinder(this.robot, 0.3, 0.35, 0.48, 0, 0.45, 0);
    this.yaw = new THREE.Group();
    this.yaw.position.y = 0.67;
    this.robot.add(this.yaw);
    this.shoulder = new THREE.Group();
    this.yaw.add(this.shoulder);
    this.joint(this.shoulder, 0.27);
    this.link(this.shoulder, 1.36, 0.23, 0.16);
    this.elbow = new THREE.Group();
    this.elbow.position.y = 1.36;
    this.shoulder.add(this.elbow);
    this.joint(this.elbow, 0.235);
    this.link(this.elbow, 1.12, 0.19, 0.12);
    this.wrist = new THREE.Group();
    this.wrist.position.y = 1.12;
    this.elbow.add(this.wrist);
    this.joint(this.wrist, 0.17);
    this.cylinder(this.wrist, 0.14, 0.17, 0.34, 0, 0.19, 0);
    this.tool = new THREE.Group();
    this.tool.position.y = 0.39;
    this.wrist.add(this.tool);
    this.box(this.tool, 0.43, 0.15, 0.25, 0, 0, 0, this.jointMaterial);
    this.fingers = [-1, 1].map((side) => {
      const finger = new THREE.Group();
      finger.position.x = side * 0.19;
      this.tool.add(finger);
      this.box(finger, 0.085, 0.29, 0.1, 0, 0.15, 0);
      this.box(
        finger,
        0.13,
        0.065,
        0.1,
        -side * 0.035,
        0.3,
        0,
        this.jointMaterial,
      );
      return finger;
    });
    this.tip = new THREE.Object3D();
    this.tip.position.y = 0.35;
    this.tool.add(this.tip);
    this.object = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 1),
      this.orangeMaterial,
    );
    this.object.position.set(1.4, -0.39, 0.2);
    this.scene.add(this.object);
    this.cylinder(
      this.scene,
      0.4,
      0.44,
      0.06,
      1.4,
      -0.67,
      0.2,
      this.jointMaterial,
    );
    // Mechanical fasteners make the character silhouette read as a physical assembly.
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      this.cylinder(
        this.robot,
        0.035,
        0.035,
        0.04,
        Math.cos(a) * 0.49,
        0.09,
        Math.sin(a) * 0.49,
        this.jointMaterial,
      );
    }
    this.worldTip = new THREE.Vector3();
  }

  cylinder(parent, top, bottom, height, x, y, z, material = this.material) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top, bottom, height, 24),
      material,
    );
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  box(parent, w, h, d, x, y, z, material = this.material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  joint(parent, radius) {
    const joint = this.cylinder(
      parent,
      radius,
      radius,
      radius * 1.6,
      0,
      0,
      0,
      this.jointMaterial,
    );
    joint.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cap = this.cylinder(
        parent,
        radius * 0.75,
        radius * 0.75,
        0.065,
        0,
        0,
        side * radius * 0.85,
      );
      cap.rotation.x = Math.PI / 2;
      const center = this.cylinder(
        parent,
        radius * 0.24,
        radius * 0.24,
        0.075,
        0,
        0,
        side * radius * 0.9,
        this.orangeMaterial,
      );
      center.rotation.x = Math.PI / 2;
    }
  }
  link(parent, length, bottom, top) {
    this.cylinder(parent, top, bottom, length - 0.14, 0, length / 2, 0);
    this.box(
      parent,
      bottom * 0.95,
      length * 0.62,
      0.045,
      0,
      length / 2,
      bottom * 0.87,
      this.jointMaterial,
    );
    this.box(
      parent,
      bottom * 0.25,
      length * 0.46,
      0.05,
      0,
      length / 2,
      bottom * 0.9,
    );
  }

  resize() {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.round(rect.width);
    this.height = Math.round(rect.height);
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.cell = this.width < 520 ? 5.5 : 6.5;
    this.cols = Math.max(1, Math.floor(this.width / this.cell));
    this.rows = Math.max(1, Math.floor(this.height / this.cell));
    if (this.renderer && !this.fallback) {
      this.renderer.setSize(this.cols, this.rows, false);
      this.sampleCanvas.width = this.cols;
      this.sampleCanvas.height = this.rows;
      this.camera.aspect = this.width / this.height;
      this.camera.setViewOffset(
        this.cols,
        this.rows,
        -this.cols * 0.025,
        -this.rows * 0.015,
        this.cols,
        this.rows,
      );
      this.camera.updateProjectionMatrix();
    }
    this.dirty = true;
    this.schedule();
  }

  bindInteraction() {
    let drag = null;
    this.host.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch" || e.isPrimary) {
        drag = {
          x: e.clientX,
          y: e.clientY,
          angle: this.angle,
          pitch: this.pitch,
        };
        this.host.setPointerCapture(e.pointerId);
      }
    });
    this.host.addEventListener("pointermove", (e) => {
      if (!drag) return;
      this.angle = drag.angle - (e.clientX - drag.x) * 0.007;
      this.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.004, -0.1, 0.9);
      this.dirty = true;
      this.schedule();
    });
    const release = () => {
      drag = null;
    };
    this.host.addEventListener("pointerup", release);
    this.host.addEventListener("pointercancel", release);
    this.host.addEventListener(
      "wheel",
      (e) => {
        // Preserve ordinary page scrolling on stacked touch layouts.
        if (this.width < 600) return;
        e.preventDefault();
        this.zoom = clamp(this.zoom + e.deltaY * 0.001, 0.75, 1.5);
        this.dirty = true;
        this.schedule();
      },
      { passive: false },
    );
    this.host.addEventListener("keydown", (e) => {
      const actions = {
        ArrowLeft: () => (this.angle -= 0.13),
        ArrowRight: () => (this.angle += 0.13),
        ArrowUp: () => (this.pitch = clamp(this.pitch + 0.08, -0.1, 0.9)),
        ArrowDown: () => (this.pitch = clamp(this.pitch - 0.08, -0.1, 0.9)),
        "+": () => (this.zoom = clamp(this.zoom - 0.1, 0.75, 1.5)),
        "=": () => (this.zoom = clamp(this.zoom - 0.1, 0.75, 1.5)),
        "-": () => (this.zoom = clamp(this.zoom + 0.1, 0.75, 1.5)),
      };
      if (actions[e.key]) {
        e.preventDefault();
        actions[e.key]();
        this.dirty = true;
        this.schedule();
      }
    });
  }

  setScene(name) {
    this.sceneName = name;
    this.time = 0;
    this.trail = [];
    this.reveal = this.paused ? 1 : 0;
    this.lastSample = 0;
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
    this.dirty = true;
    this.schedule();
  }
  reset() {
    this.angle = 0.5;
    this.pitch = 0.24;
    this.zoom = 1;
    this.dirty = true;
    this.schedule();
  }
  schedule() {
    if (!this.frame && !document.hidden)
      this.frame = requestAnimationFrame(this.tick);
  }

  pose(t) {
    if (this.sceneName === "trace")
      return {
        shoulder: -0.16 + Math.sin(t * 0.7) * 0.36,
        elbow: -1.65 + Math.cos(t * 0.7) * 0.35,
        yaw: Math.sin(t * 0.7) * 0.45,
        wrist: -0.85 + Math.cos(t * 0.7) * 0.35,
      };
    if (this.sceneName === "balance")
      return {
        shoulder: 0.14 + Math.sin(t) * 0.25,
        elbow: -1.2 + Math.sin(t * 1.3) * 0.3,
        yaw: Math.sin(t * 0.4) * 0.3,
        wrist: 0.12 - Math.sin(t) * 0.25 - Math.sin(t * 1.3) * 0.3,
      };
    return {
      shoulder: 0.1 + Math.sin(t * 0.65) * 0.35,
      elbow: -1.7 + Math.sin(t * 0.65 + 0.8) * 0.45,
      yaw: Math.sin(t * 0.4) * 0.48,
      wrist: -0.9 + Math.cos(t * 0.65) * 0.3,
    };
  }

  drawFloor() {
    const { ctx, width: w, height: h } = this;
    ctx.save();
    ctx.strokeStyle = this.dim;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 0.6;
    const cy = h * 0.75,
      cx = w * 0.52,
      scale = Math.min(w * 0.49, h * 0.47);
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + (i * scale) / 6 - scale * 0.7, cy - scale * 0.21);
      ctx.lineTo(cx + (i * scale) / 6 + scale * 0.7, cy + scale * 0.21);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + (i * scale) / 6 + scale * 0.7, cy - scale * 0.21);
      ctx.lineTo(cx + (i * scale) / 6 - scale * 0.7, cy + scale * 0.21);
      ctx.stroke();
    }
    ctx.restore();
  }

  draw3D() {
    const pose = this.pose(this.time);
    this.shoulder.rotation.z = pose.shoulder;
    this.elbow.rotation.z = pose.elbow;
    this.wrist.rotation.z = pose.wrist;
    this.yaw.rotation.y = pose.yaw;
    this.fingers.forEach((finger, i) => {
      finger.position.x =
        (i ? 1 : -1) * (0.18 + 0.04 * Math.sin(this.time * 0.65));
    });
    this.object.rotation.set(this.time * 0.3, this.time * 0.5, 0);
    this.object.position.y = -0.38 + Math.sin(this.time * 1.2) * 0.06;
    const distance = (this.width < 520 ? 9.2 : 7.0) * this.zoom;
    this.camera.position.set(
      Math.sin(this.angle) * distance,
      1.0 + Math.sin(this.pitch) * distance,
      Math.cos(this.angle) * distance,
    );
    this.camera.lookAt(0.12, 0.65, 0);
    this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld(true);
    this.tip.getWorldPosition(this.worldTip);
    if (!this.paused && this.time - this.lastSample > 0.045) {
      this.trail.push(this.worldTip.clone());
      if (this.trail.length > 95) this.trail.shift();
      this.lastSample = this.time;
    }
    this.drawTrail();
    this.renderer.render(this.scene, this.camera);
    this.sampleCtx.clearRect(0, 0, this.cols, this.rows);
    this.sampleCtx.drawImage(this.renderer.domElement, 0, 0);
    const data = this.sampleCtx.getImageData(0, 0, this.cols, this.rows).data;
    const chars = "·:+x≡▒▓█";
    const ctx = this.ctx,
      cell = this.cell;
    ctx.font = `${cell + 0.5}px "IBM Plex Mono",monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = (y * this.cols + x) * 4;
        if (data[i + 3] < 30) continue;
        const hash = ((x * 73 + y * 131) % 101) / 100;
        if (hash > this.reveal) continue;
        const light =
          (data[i] * 0.21 + data[i + 1] * 0.72 + data[i + 2] * 0.07) / 255;
        const orange = data[i] > data[i + 1] * 1.22;
        ctx.fillStyle = orange ? this.accent : this.ink;
        ctx.globalAlpha = (0.76 + light * 0.24) * Math.min(1, this.reveal * 2);
        if (this.style === "points") {
          ctx.beginPath();
          ctx.arc(x * cell, y * cell, 0.8 + light * 1.6, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillText(
            chars[
              Math.min(
                chars.length - 1,
                Math.floor(Math.pow(light, 0.55) * (chars.length - 1)),
              )
            ],
            x * cell,
            y * cell,
          );
        }
      }
    }
    ctx.globalAlpha = 1;
    this.sample(pose, this.worldTip);
  }

  drawTrail() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.accent;
    this.trail.forEach((point, i) => {
      const p = point.clone().project(this.camera);
      const x = ((p.x + 1) * this.width) / 2,
        y = ((1 - p.y) * this.height) / 2;
      const fade = i / this.trail.length;
      for (let line = -2; line <= 2; line++) {
        ctx.globalAlpha =
          fade * 0.42 * (1 - Math.abs(line) * 0.2) * this.reveal;
        const offset = line * (7 + Math.sin(i * 0.2) * 3);
        ctx.fillRect(x + offset, y + line * 4, 2, 2);
      }
    });
    ctx.restore();
  }

  drawFallback() {
    // A self-contained 2D articulated study for browsers without WebGL.
    const { ctx, width: w, height: h } = this,
      pose = this.pose(this.time);
    const s = Math.min(w * 0.27, h * 0.24) / this.zoom;
    const base = { x: w * 0.43, y: h * 0.77 };
    const a = { x: base.x, y: base.y - s * 0.35 };
    const b = {
      x: a.x - Math.sin(pose.shoulder) * s,
      y: a.y - Math.cos(pose.shoulder) * s,
    };
    const c = {
      x: b.x - Math.sin(pose.shoulder + pose.elbow) * s * 0.8,
      y: b.y - Math.cos(pose.shoulder + pose.elbow) * s * 0.8,
    };
    ctx.save();
    ctx.translate(w * 0.5, 0);
    ctx.scale(0.85 + Math.cos(this.angle) * 0.15, 1);
    ctx.translate(-w * 0.5, 0);
    ctx.fillStyle = this.ink;
    ctx.font = `${this.cell + 1}px monospace`;
    ctx.textAlign = "center";
    const bar = (p, q, width) => {
      const dx = q.x - p.x,
        dy = q.y - p.y,
        length = Math.hypot(dx, dy);
      for (let u = 0; u < length; u += this.cell)
        for (let v = -width / 2; v <= width / 2; v += this.cell) {
          const x = p.x + (dx * u) / length - (dy * v) / length,
            y = p.y + (dy * u) / length + (dx * v) / length;
          ctx.globalAlpha =
            this.reveal * (0.45 + ((v + width / 2) / width) * 0.5);
          if (this.style === "points") {
            ctx.beginPath();
            ctx.arc(x, y, 1.6, 0, TAU);
            ctx.fill();
          } else ctx.fillText(v > 0 ? "▓" : "▒", x, y);
        }
    };
    bar(
      { x: base.x - s * 0.35, y: base.y },
      { x: base.x + s * 0.35, y: base.y },
      s * 0.17,
    );
    bar(base, a, s * 0.35);
    bar(a, b, s * 0.19);
    bar(b, c, s * 0.15);
    ctx.strokeStyle = this.accent;
    ctx.lineWidth = 2;
    [a, b, c].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.1, 0, TAU);
      ctx.stroke();
    });
    bar(c, { x: c.x + s * 0.23, y: c.y + s * 0.25 }, s * 0.08);
    ctx.restore();
    ctx.globalAlpha = 1;
    this.sample(pose, { x: c.x / s, y: c.y / s, z: 0 });
  }

  sample(pose, tip) {
    const future = this.pose(this.time + 0.001);
    const velocity = (future.elbow - pose.elbow) / 0.001;
    this.onSample?.({
      time: this.time,
      velocity,
      tip,
      scene: this.sceneName,
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
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.08) : 0.032;
    this.last = now;
    if (!this.paused) this.time += dt;
    this.reveal = this.paused ? 1 : Math.min(1, this.reveal + dt * 1.15);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawFloor();
    if (this.fallback) this.drawFallback();
    else this.draw3D();
    this.dirty = false;
    this.canvas.dataset.renderer = this.fallback ? "canvas" : "webgl";
    this.canvas.dataset.time = this.time.toFixed(3);
    document.querySelector("#scene-loading").classList.add("loaded");
    if (!this.paused) this.schedule();
  }
}
