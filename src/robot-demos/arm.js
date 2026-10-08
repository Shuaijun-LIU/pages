import * as THREE from "three";
/** Six revolute joints, metres, right-handed Y-up. Replace this adapter for real robots. */
export function createArm() {
  const root = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: 0xe6e9dd,
    roughness: 0.36,
    metalness: 0.12,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x324d41,
    roughness: 0.45,
    metalness: 0.3,
  });
  const green = new THREE.MeshStandardMaterial({
    color: 0x739771,
    roughness: 0.45,
    metalness: 0.15,
  });
  const mesh = (parent, geometry, material, position = [0, 0, 0]) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...position);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const cylinder = (parent, r, h, material, y = 0) =>
    mesh(parent, new THREE.CylinderGeometry(r, r, h, 32), material, [0, y, 0]);
  cylinder(root, 0.27, 0.09, dark, 0.045);
  cylinder(root, 0.185, 0.16, shell, 0.16);
  const yaw = new THREE.Group();
  yaw.position.y = 0.24;
  root.add(yaw);
  cylinder(yaw, 0.145, 0.2, dark, 0.07);
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.15;
  yaw.add(shoulder);
  const jointCap = (parent) => {
    const m = cylinder(parent, 0.108, 0.2, dark);
    m.rotation.x = Math.PI / 2;
    const cap = cylinder(parent, 0.062, 0.211, green);
    cap.rotation.x = Math.PI / 2;
  };
  const link = (parent, length, radius) => {
    cylinder(parent, radius, length - 0.1, shell, length / 2);
  };
  jointCap(shoulder);
  link(shoulder, 0.66, 0.08);
  const elbow = new THREE.Group();
  elbow.position.y = 0.66;
  shoulder.add(elbow);
  jointCap(elbow);
  link(elbow, 0.57, 0.065);
  const wristPitch = new THREE.Group();
  wristPitch.position.y = 0.57;
  elbow.add(wristPitch);
  jointCap(wristPitch);
  link(wristPitch, 0.2, 0.053);
  const wristRoll = new THREE.Group();
  wristRoll.position.y = 0.2;
  wristPitch.add(wristRoll);
  cylinder(wristRoll, 0.058, 0.11, dark, 0.03);
  const flange = new THREE.Group();
  flange.position.y = 0.09;
  wristRoll.add(flange);
  cylinder(flange, 0.07, 0.05, green);
  mesh(flange, new THREE.BoxGeometry(0.18, 0.065, 0.09), shell, [0, 0.053, 0]);
  for (const x of [-0.07, 0.07]) {
    mesh(flange, new THREE.BoxGeometry(0.026, 0.115, 0.055), dark, [
      x,
      0.135,
      0,
    ]);
    mesh(flange, new THREE.BoxGeometry(0.035, 0.025, 0.055), green, [
      x * 0.84,
      0.2,
      0,
    ]);
  }
  const tcp = new THREE.Object3D();
  tcp.position.y = 0.2;
  flange.add(tcp);
  mesh(
    tcp,
    new THREE.SphereGeometry(0.024, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x2f8751 }),
  );
  const joints = [yaw, shoulder, elbow, wristPitch, wristRoll, flange];
  const axes = ["y", "z", "z", "z", "y", "y"];
  return {
    root,
    tcp,
    setPose(q) {
      joints.forEach((joint, i) => {
        joint.rotation[axes[i]] = q[i];
      });
      root.updateMatrixWorld(true);
    },
    getTCP: () => tcp.getWorldPosition(new THREE.Vector3()),
  };
}

/** Piecewise linear playback of timestamped samples; no policy or inference. */
export function sampleTrajectory(trajectory, time) {
  const frames = trajectory.frames;
  const t = THREE.MathUtils.clamp(time, frames[0].t, frames.at(-1).t);
  let lo = 0,
    hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = frames[lo],
    b = frames[hi],
    u = (t - a.t) / (b.t - a.t);
  return a.q.map((q, i) => THREE.MathUtils.lerp(q, b.q[i], u));
}
