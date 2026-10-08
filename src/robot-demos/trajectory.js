import "./style.css";
import * as THREE from "three";
import {
  createViewer,
  bindCameraButtons,
  reducedMotion,
  publicAsset,
} from "./viewer.js";
import { createTimeline } from "./timeline.js";
import { createArm, sampleTrajectory } from "./arm.js";

const stage = document.querySelector("#trajectory-stage");
const play = document.querySelector("#play");
const slider = document.querySelector("#timeline");
let clock;
const viewer = createViewer(stage, {
  position: [2.65, 1.9, 3.1],
  target: [0.45, 0.65, 0],
  onFrame: (_, dt) => clock?.tick(dt),
});
if (viewer) {
  bindCameraButtons(viewer, {
    perspective: [2.65, 1.9, 3.1],
    front: [0.45, 1.05, 4],
    top: [0.45, 4.5, 0.01],
  });
  const arm = createArm();
  viewer.scene.add(arm.root);
  document.querySelector("#joints").innerHTML = Array.from(
    { length: 6 },
    (_, i) =>
      `<div class="joint-row"><span>J${i + 1}</span><span class="joint-bar"><i class="joint-fill" id="bar-${i}"></i></span><span class="joint-value" id="joint-${i}">0.0°</span></div>`,
  ).join("");
  try {
    const response = await fetch(
      publicAsset("robot-demos/sample-trajectory.json"),
    );
    if (!response.ok) throw new Error(`Trajectory returned ${response.status}`);
    const trajectory = await response.json();
    const points = trajectory.frames.map((frame) => {
      arm.setPose(frame.q);
      return arm.getTCP();
    });
    const traceGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const completeTrace = new THREE.Line(
      traceGeometry,
      new THREE.LineBasicMaterial({
        color: 0x718e74,
        transparent: true,
        opacity: 0.25,
      }),
    );
    const progressGeometry = traceGeometry.clone();
    const progressTrace = new THREE.Line(
      progressGeometry,
      new THREE.LineBasicMaterial({ color: 0x256c43 }),
    );
    viewer.scene.add(completeTrace, progressTrace);
    // A small ring on the ground identifies the robot's mounting origin.
    const mountRing = new THREE.Mesh(
      new THREE.RingGeometry(0.33, 0.337, 64),
      new THREE.MeshBasicMaterial({ color: 0x8ca98a, side: THREE.DoubleSide }),
    );
    mountRing.rotation.x = -Math.PI / 2;
    mountRing.position.y = -0.02;
    viewer.scene.add(mountRing);
    clock = createTimeline({
      duration: trajectory.duration,
      playing: !reducedMotion,
      onChange: ({ time, playing }) => {
        const q = sampleTrajectory(trajectory, time);
        arm.setPose(q);
        const tcp = arm.getTCP();
        for (const axis of ["x", "y", "z"])
          document.querySelector(`#tcp-${axis}`).textContent =
            tcp[axis].toFixed(3);
        q.forEach((v, i) => {
          document.querySelector(`#joint-${i}`).textContent =
            `${THREE.MathUtils.radToDeg(v).toFixed(1)}°`;
          document.querySelector(`#bar-${i}`).style.width =
            `${(v / Math.PI + 1) * 50}%`;
        });
        progressGeometry.setDrawRange(
          0,
          Math.max(
            1,
            Math.floor((time / trajectory.duration) * (points.length - 1)) + 1,
          ),
        );
        play.textContent = playing ? "Ⅱ  Pause" : "▷  Play";
        play.setAttribute(
          "aria-label",
          playing ? "Pause playback" : "Play playback",
        );
        slider.value = time;
        slider.setAttribute("aria-valuetext", `${time.toFixed(2)} seconds`);
        document.querySelector("#time-display").textContent =
          `${time.toFixed(2)} / ${trajectory.duration.toFixed(2)} s`;
        stage.dataset.time = time.toFixed(3);
        stage.dataset.tcp = tcp
          .toArray()
          .map((v) => v.toFixed(4))
          .join(",");
      },
    });
    clock.notify();
    play.addEventListener("click", () => clock.toggle());
    document
      .querySelector("#reset")
      .addEventListener("click", () => clock.reset());
    slider.max = trajectory.duration;
    slider.addEventListener("input", () => clock.seek(slider.value));
    document
      .querySelector("#speed")
      .addEventListener("change", (e) => clock.speed(e.target.value));
    document.querySelector("#trail-toggle").addEventListener("change", (e) => {
      completeTrace.visible = progressTrace.visible = e.target.checked;
      stage.dataset.trail = String(e.target.checked);
    });
    stage.dataset.trail = "true";
    stage.dataset.ready = "true";
    document.querySelector("#load-status").textContent = "";
  } catch (error) {
    stage.dataset.ready = "error";
    document.querySelector("#load-status").textContent =
      "The sample trajectory could not load. Reload the page to try again.";
    console.error("Trajectory:", error);
  }
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) viewer.dispose();
  });
}
