import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  createViewer,
  bindCameraButtons,
  reducedMotion,
  publicAsset,
} from "./viewer.js";
import { createTimeline } from "./timeline.js";

const stage = document.querySelector("#hero-stage");
const play = document.querySelector("#play");
const tour = document.querySelector("#tour");
let joints = [],
  touring = false;
const rotation = new THREE.Quaternion();
const clock = createTimeline({
  duration: 12,
  playing: !reducedMotion,
  onChange: ({ playing, time }) => {
    play.textContent = playing ? "Ⅱ  Pause motion" : "▷  Play motion";
    play.setAttribute("aria-label", playing ? "Pause motion" : "Play motion");
    stage.dataset.time = time.toFixed(3);
  },
});
const viewer = createViewer(stage, {
  position: [1.8, 1.18, 2.35],
  target: [0, 0.69, 0],
  onFrame: (_, dt) => {
    clock.tick(dt);
    const t = clock.state.time;
    for (const { node, bind, axis, name } of joints) {
      let angle = 0;
      const side = name.startsWith("left") ? 1 : -1;
      if (name.includes("shoulder_pitch"))
        angle = -0.1 + 0.09 * Math.sin(t * 0.8 + side);
      if (name.includes("shoulder_roll")) angle = side * 0.1;
      if (name.includes("elbow"))
        angle = 0.24 + 0.13 * Math.sin(t * 0.8 + side);
      if (name.includes("waist_yaw")) angle = 0.08 * Math.sin(t * 0.6);
      if (name.includes("wrist_yaw")) angle = 0.12 * Math.sin(t * 0.6);
      node.quaternion
        .copy(bind)
        .multiply(rotation.setFromAxisAngle(axis, angle));
    }
    viewer.controls.autoRotate = touring && clock.state.playing;
  },
});
clock.notify();
if (viewer) {
  viewer.controls.autoRotateSpeed = 0.65;
  const stopTour = () => {
    touring = false;
    tour.setAttribute("aria-pressed", "false");
  };
  bindCameraButtons(
    viewer,
    {
      perspective: [1.8, 1.18, 2.35],
      front: [0, 0.96, 3.5],
      side: [3.5, 0.96, 0.02],
    },
    stopTour,
  );
  play.addEventListener("click", () => clock.toggle());
  tour.addEventListener("click", () => {
    touring = !touring;
    tour.setAttribute("aria-pressed", String(touring));
    if (touring && !clock.state.playing) clock.toggle();
    document
      .querySelectorAll("button[data-camera]")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
  });
  viewer.controls.addEventListener("start", stopTour);
  document.querySelector("#reset").addEventListener("click", () => {
    stopTour();
    viewer.reset();
    clock.reset();
    document
      .querySelectorAll("button[data-camera]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.camera === "perspective"),
        ),
      );
  });
  try {
    const gltf = await new GLTFLoader().loadAsync(
      publicAsset("models/humanoid.glb"),
    );
    gltf.scene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
        node.material.color.setHex(
          node.material.name === "black" ? 0x35463d : 0xb9c3b6,
        );
        node.material.metalness = 0.22;
        node.material.roughness = 0.6;
        node.material.side = THREE.DoubleSide;
        node.material.flatShading = true;
      }
      if (node.userData.jointAxis)
        joints.push({
          node,
          name: node.name,
          bind: node.quaternion.clone(),
          axis: new THREE.Vector3(...node.userData.jointAxis),
        });
    });
    viewer.scene.add(gltf.scene);
    stage.dataset.ready = "true";
    document.querySelector("#load-status").textContent = "";
  } catch (error) {
    stage.dataset.ready = "error";
    document.querySelector("#load-status").textContent =
      "The robot model could not load. Reload the page to try again.";
    console.error("Robot model:", error);
  }
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) viewer.dispose();
  });
}
