import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Actual Panda visual meshes and MJCF joint frames; external root adapts Z-up to Y-up. */
export async function createArm(manifestURL) {
  const response = await fetch(manifestURL);
  if (!response.ok) throw new Error(`Panda manifest returned ${response.status}`);
  const model = await response.json();
  const loader = new GLTFLoader();
  const visuals = await Promise.all(
    model.links.map((link) => loader.loadAsync(new URL(link.mesh, manifestURL).href)),
  );
  const root = new THREE.Group();
  root.name = "Franka Emika Panda";
  root.rotation.x = -Math.PI / 2;
  const links = new Map();
  const joints = [];
  let meshCount = 0;
  model.links.forEach((link, index) => {
    // A fixed origin followed by the joint motion matches MJCF local frames.
    const origin = new THREE.Group();
    origin.position.fromArray(link.position);
    const [w, x, y, z] = link.quaternion;
    origin.quaternion.set(x, y, z, w);
    (link.parent ? links.get(link.parent) : root).add(origin);
    const motion = new THREE.Group();
    motion.name = link.name;
    origin.add(motion);
    links.set(link.name, motion);
    if (link.joint?.type === "revolute") {
      joints[link.joint.index] = {
        node: motion,
        axis: new THREE.Vector3(...link.joint.axis),
        limits: link.joint.limits,
      };
    } else if (link.joint?.type === "prismatic") {
      motion.position.fromArray(link.joint.axis).multiplyScalar(model.fingerPosition);
    }
    const visual = visuals[index].scene;
    visual.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = node.receiveShadow = true;
      meshCount++;
    });
    motion.add(visual);
  });
  const tcp = new THREE.Object3D();
  tcp.position.fromArray(model.tcp.position);
  links.get(model.tcp.parent).add(tcp);
  const arm = {
    root, tcp, model, meshCount,
    limits: joints.map((joint) => joint.limits),
    setPose(q) {
      if (q.length !== joints.length || q.some((v) => !Number.isFinite(v)))
        throw new Error("Panda pose requires seven finite joint angles");
      joints.forEach((joint, i) => {
        if (q[i] < joint.limits[0] || q[i] > joint.limits[1])
          throw new Error(`Panda joint ${i + 1} is outside its limits`);
        joint.node.quaternion.setFromAxisAngle(joint.axis, q[i]);
      });
      root.updateMatrixWorld(true);
    },
    getTCP: () => tcp.getWorldPosition(new THREE.Vector3()),
  };
  arm.setPose(model.home);
  return arm;
}

/** Piecewise linear playback of timestamped samples; no policy or inference. */
export function sampleTrajectory(trajectory, time) {
  const frames = trajectory.frames;
  const t = THREE.MathUtils.clamp(time, frames[0].t, frames.at(-1).t);
  let lo = 0, hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = frames[lo], b = frames[hi], u = (t - a.t) / (b.t - a.t);
  return a.q.map((q, i) => THREE.MathUtils.lerp(q, b.q[i], u));
}
