import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const reducedMotion = matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
export const publicAsset = (path) =>
  new URL(`../../${path}`, document.baseURI).href;

/** Shared Y-up stage. onFrame receives elapsed seconds, clamped frame delta. */
export function createViewer(
  container,
  {
    target = [0, 0.7, 0],
    position = [2.2, 1.7, 3.3],
    exposure = 1.25,
    lightIntensity = 1,
    onFrame = () => {},
  } = {},
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e9eeeb");
  scene.fog = new THREE.Fog("#e9eeeb", 7, 15);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.03, 40);
  camera.position.set(...position);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
  } catch {
    container.dataset.ready = "error";
    container.innerHTML =
      '<p class="fallback" role="status">This interactive scene needs WebGL 2. Please open it in a browser with WebGL enabled.</p>';
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive robot scene. Drag to orbit; scroll to zoom.",
  );
  renderer.domElement.setAttribute("tabindex", "0");
  container.prepend(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...target);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.085;
  controls.minDistance = 1.4;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI / 2 - 0.025;
  controls.enablePan = false;
  controls.update();
  const initial = { position: [...position], target: [...target] };
  let transition = null;
  const preset = (position, target = initial.target, animate = true) => {
    if (!animate || reducedMotion) {
      camera.position.set(...position);
      controls.target.set(...target);
      controls.update();
      transition = null;
    } else
      transition = {
        from: camera.position.clone(),
        to: new THREE.Vector3(...position),
        targetFrom: controls.target.clone(),
        targetTo: new THREE.Vector3(...target),
        elapsed: 0,
      };
  };
  controls.addEventListener("start", () => {
    transition = null;
  });
  renderer.domElement.addEventListener("keydown", (e) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "-",
        "=",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    transition = null;
    const offset = camera.position.clone().sub(controls.target);
    const sphere = new THREE.Spherical().setFromVector3(offset);
    if (e.key === "ArrowLeft") sphere.theta -= 0.15;
    if (e.key === "ArrowRight") sphere.theta += 0.15;
    if (e.key === "ArrowUp") sphere.phi -= 0.1;
    if (e.key === "ArrowDown") sphere.phi += 0.1;
    if (["+", "="].includes(e.key)) sphere.radius *= 0.9;
    if (e.key === "-") sphere.radius *= 1.1;
    sphere.radius = THREE.MathUtils.clamp(
      sphere.radius,
      controls.minDistance,
      controls.maxDistance,
    );
    sphere.phi = THREE.MathUtils.clamp(sphere.phi, 0.1, controls.maxPolarAngle);
    camera.position
      .copy(controls.target)
      .add(new THREE.Vector3().setFromSpherical(sphere));
    controls.update();
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7b8f82, 2.5 * lightIntensity));
  const key = new THREE.DirectionalLight(0xfff8e8, 4 * lightIntensity);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc7e4ff, 2 * lightIntensity);
  rim.position.set(-3, 2, -2);
  scene.add(rim);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0xe4eae5, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.035;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(14, 70, 0xa2b8a9, 0xc8d4cb);
  grid.position.y = -0.029;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);
  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  let last = 0,
    elapsed = 0;
  renderer.setAnimationLoop((now) => {
    if (document.hidden) {
      last = now;
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    elapsed += dt;
    if (transition) {
      transition.elapsed += dt;
      const p = Math.min(transition.elapsed / 0.7, 1),
        eased = p * p * (3 - 2 * p);
      camera.position.lerpVectors(transition.from, transition.to, eased);
      controls.target.lerpVectors(
        transition.targetFrom,
        transition.targetTo,
        eased,
      );
      if (p === 1) transition = null;
    }
    onFrame(elapsed, dt);
    controls.update(dt);
    renderer.render(scene, camera);
    renderer.domElement.dataset.camera = camera.position
      .toArray()
      .map((x) => x.toFixed(3))
      .join(",");
  });
  return {
    scene,
    camera,
    renderer,
    controls,
    preset,
    reset: () => preset(initial.position, initial.target),
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) for (const m of [].concat(o.material)) m.dispose();
      });
      renderer.dispose();
    },
  };
}

export function bindCameraButtons(viewer, presets, onChange = () => {}) {
  document.querySelectorAll("[data-camera]").forEach((button) =>
    button.addEventListener("click", () => {
      const name = button.dataset.camera;
      viewer.preset(presets[name]);
      document
        .querySelectorAll("button[data-camera]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      onChange(name);
    }),
  );
}
