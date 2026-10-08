import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const SCENES = [
  {
    id: "harvest",
    label: "Harvest",
    headline: "A little curiosity ...",
    line: "Reach further. Bring a possibility closer.",
    center: [0, 0.72, 0],
    distance: 2.65,
  },
  {
    id: "transfer",
    label: "Transfer",
    headline: "Care in every gesture",
    line: "Two hands. One continuous conversation.",
    center: [0, 0.53, 0],
    distance: 2.65,
  },
  {
    id: "fold",
    label: "Fold",
    headline: "Shape the everyday",
    line: "Small movements make a world of difference.",
    center: [0, 0.97, 0.1],
    distance: 1.9,
  },
  {
    id: "run",
    label: "Run",
    headline: "Find a new rhythm",
    line: "Explore the space between one step and the next.",
    center: [0, 0.7, 0],
    distance: 2.85,
  },
];
const white = new THREE.MeshStandardMaterial({
  color: 0xd6d6dc,
  metalness: 0.32,
  roughness: 0.55,
});
const dark = new THREE.MeshStandardMaterial({
  color: 0x34343e,
  metalness: 0.5,
  roughness: 0.5,
});
const pale = new THREE.MeshStandardMaterial({
  color: 0xbabac8,
  roughness: 0.9,
  side: THREE.DoubleSide,
});
const smooth = (t) => {
  t = THREE.MathUtils.clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.fromArray(position);
  parent.add(m);
  return m;
}
function box(parent, size, position, material = white) {
  return mesh(parent, new THREE.BoxGeometry(...size), material, position);
}
function cylinder(parent, r1, r2, h, position, material = white) {
  return mesh(
    parent,
    new THREE.CylinderGeometry(r1, r2, h, 24),
    material,
    position,
  );
}

class RobotRig {
  constructor(template) {
    this.root = template.clone(true);
    this.joints = new Map();
    this.root.traverse((node) => {
      if (node.userData.jointName)
        this.joints.set(node.userData.jointName, {
          node,
          bind: node.quaternion.clone(),
          axis: new THREE.Vector3(...node.userData.jointAxis),
          angle: 0,
        });
    });
    this.pelvis = this.root.getObjectByName("pelvis");
    this.pelvisOrigin = this.pelvis.position.clone();
    this.hands = ["left", "right"].map((side) => {
      const hand = new THREE.Object3D();
      hand.position.set(0.1, 0, 0);
      this.root.getObjectByName(`${side}_wrist_yaw_link`).add(hand);
      return hand;
    });
    this.trackers = [...this.hands];
    for (const side of ["left", "right"])
      for (const part of [
        "elbow",
        "knee",
        "ankle_roll",
        "shoulder_roll",
        "wrist_pitch",
      ]) {
        const node = this.root.getObjectByName(`${side}_${part}_link`);
        if (node) this.trackers.push(node);
      }
  }
  set(name, angle) {
    const j = this.joints.get(name);
    if (j) {
      j.angle = angle;
      j.node.quaternion
        .copy(j.bind)
        .multiply(new THREE.Quaternion().setFromAxisAngle(j.axis, angle));
    }
  }
  neutral() {
    for (const [name] of this.joints) this.set(name, 0);
    this.pelvis.position.copy(this.pelvisOrigin);
    this.set("left_hip_pitch_joint", -0.1);
    this.set("right_hip_pitch_joint", -0.1);
    this.set("left_knee_joint", 0.2);
    this.set("right_knee_joint", 0.2);
    this.set("left_ankle_pitch_joint", -0.1);
    this.set("right_ankle_pitch_joint", -0.1);
    this.set("left_shoulder_roll_joint", 0.13);
    this.set("right_shoulder_roll_joint", -0.13);
  }
  reach(side, target) {
    const names = ["shoulder_pitch", "shoulder_roll", "shoulder_yaw", "elbow"];
    const chain = names
      .map((part) => this.joints.get(`${side}_${part}_joint`))
      .filter(Boolean);
    const hand = this.hands[side === "left" ? 0 : 1];
    const limits = [
      [-2.7, 2.5],
      side === "left" ? [-0.4, 2.6] : [-2.6, 0.4],
      [-2.5, 2.5],
      [-0.5, 2.5],
    ];
    const pivot = vec(),
      end = vec(),
      axis = vec(),
      a = vec(),
      b = vec(),
      cross = vec(),
      q = new THREE.Quaternion();
    for (let iteration = 0; iteration < 16; iteration++)
      for (let i = chain.length - 1; i >= 0; i--) {
        const j = chain[i];
        this.root.updateMatrixWorld(true);
        j.node.getWorldPosition(pivot);
        hand.getWorldPosition(end);
        axis
          .copy(j.axis)
          .applyQuaternion(j.node.getWorldQuaternion(q))
          .normalize();
        a.copy(end).sub(pivot);
        b.copy(target).sub(pivot);
        a.addScaledVector(axis, -a.dot(axis));
        b.addScaledVector(axis, -b.dot(axis));
        if (a.lengthSq() < 1e-8 || b.lengthSq() < 1e-8) continue;
        a.normalize();
        b.normalize();
        const turn = Math.atan2(
          axis.dot(cross.crossVectors(a, b)),
          THREE.MathUtils.clamp(a.dot(b), -1, 1),
        );
        const angle = THREE.MathUtils.clamp(
          j.angle + THREE.MathUtils.clamp(turn, -0.45, 0.45),
          ...limits[i],
        );
        j.angle = angle;
        j.node.quaternion
          .copy(j.bind)
          .multiply(q.setFromAxisAngle(j.axis, angle));
      }
  }
}

function harvest(template) {
  const root = new THREE.Group(),
    rig = new RobotRig(template);
  root.add(rig.root);
  const fruit = mesh(
    root,
    new THREE.SphereGeometry(0.062, 18, 12),
    pale,
    [-0.4, 1.1, 0.28],
  );
  cylinder(fruit, 0.007, 0.005, 0.045, [0, 0.068, 0], dark);
  const leaf = mesh(
    fruit,
    new THREE.SphereGeometry(0.018, 10, 6),
    white,
    [0.02, 0.08, 0],
  );
  leaf.scale.set(1.8, 0.25, 0.8);
  const source = vec(-0.4, 1.12, 0.25),
    destination = vec(0.12, 0.83, 0.34);
  return {
    root,
    trackers: rig.trackers,
    update(t) {
      rig.neutral();
      const p = (t % 7) / 7;
      const reach = smooth(p / 0.23),
        carry = smooth((p - 0.32) / 0.29),
        release = smooth((p - 0.72) / 0.16);
      const target = vec(-0.25, 0.83, 0.15)
        .lerp(source, reach)
        .lerp(destination, carry)
        .lerp(vec(-0.25, 0.8, 0.12), release);
      rig.set("waist_yaw_joint", -0.12 + carry * 0.24);
      rig.set("right_elbow_joint", 0.65);
      rig.set("right_shoulder_pitch_joint", -0.5);
      rig.reach("right", target);
      rig.set("left_shoulder_pitch_joint", -0.65);
      rig.set("left_elbow_joint", 1.0);
      rig.root.updateMatrixWorld(true);
      if (p > 0.24 && p < 0.73) {
        rig.hands[1].getWorldPosition(fruit.position);
        fruit.position.y -= 0.045;
      } else if (p >= 0.73)
        fruit.position.copy(destination).lerp(source, smooth((p - 0.9) / 0.1));
      else fruit.position.copy(source);
      fruit.rotation.y = t * 0.35;
      return [
        rig.joints.get("right_shoulder_pitch_joint").angle,
        rig.joints.get("right_elbow_joint").angle,
        rig.joints.get("waist_yaw_joint").angle,
      ];
    },
  };
}

function makeArm(parent, side) {
  const base = new THREE.Group();
  base.position.set(side * 0.49, 0.12, 0);
  parent.add(base);
  cylinder(base, 0.13, 0.16, 0.12, [0, 0, 0], dark);
  const yaw = new THREE.Group();
  base.add(yaw);
  const shoulder = new THREE.Group();
  yaw.add(shoulder);
  const disc = (node, r) => {
    const d = cylinder(node, r, r, 0.15, [0, 0, 0], dark);
    d.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      const c = cylinder(node, r * 0.76, r * 0.76, 0.026, [0, 0, s * 0.08]);
      c.rotation.x = Math.PI / 2;
    }
  };
  disc(shoulder, 0.11);
  box(shoulder, [0.1, 0.39, 0.12], [0, 0.19, 0]);
  box(shoulder, [0.045, 0.28, 0.135], [0, 0.18, 0], dark);
  const elbow = new THREE.Group();
  elbow.position.y = 0.38;
  shoulder.add(elbow);
  disc(elbow, 0.095);
  box(elbow, [0.085, 0.36, 0.1], [0, 0.18, 0]);
  box(elbow, [0.035, 0.26, 0.115], [0, 0.18, 0], dark);
  const wrist = new THREE.Group();
  wrist.position.y = 0.36;
  elbow.add(wrist);
  disc(wrist, 0.069);
  const palm = box(wrist, [0.2, 0.07, 0.1], [0, 0.075, 0], dark);
  const fingers = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Group();
    f.position.set(s * 0.086, 0.08, 0);
    wrist.add(f);
    box(f, [0.03, 0.12, 0.055], [0, 0.06, 0]);
    box(f, [0.055, 0.028, 0.055], [-s * 0.012, 0.115, 0], dark);
    fingers.push(f);
  }
  const tip = new THREE.Object3D();
  tip.position.y = 0.17;
  wrist.add(tip);
  return {
    base,
    yaw,
    shoulder,
    elbow,
    wrist,
    tip,
    fingers,
    trackers: [shoulder, elbow, wrist, tip, palm],
  };
}
function transfer() {
  const root = new THREE.Group(),
    left = makeArm(root, -1),
    right = makeArm(root, 1);
  box(root, [0.95, 0.05, 0.32], [0, 0.035, 0], dark);
  const cup = new THREE.Group();
  root.add(cup);
  mesh(cup, new THREE.CylinderGeometry(0.072, 0.052, 0.15, 32, 1, true), pale);
  mesh(
    cup,
    new THREE.TorusGeometry(0.072, 0.009, 8, 32),
    white,
    [0, 0.075, 0],
  ).rotation.x = Math.PI / 2;
  cylinder(cup, 0.052, 0.052, 0.008, [0, -0.072, 0], pale);
  const handle = mesh(
    cup,
    new THREE.TorusGeometry(0.047, 0.012, 8, 20, Math.PI * 1.6),
    white,
    [0.079, 0, 0],
  );
  handle.rotation.z = -Math.PI * 0.8;
  return {
    root,
    trackers: [...left.trackers, ...right.trackers, cup],
    update(t) {
      const wave = Math.sin(t * 0.8),
        lift = Math.sin(t * 0.8 + 0.7);
      for (const [arm, side] of [
        [left, -1],
        [right, 1],
      ]) {
        arm.yaw.rotation.y = 0.13 * Math.sin(t * 0.6);
        arm.shoulder.rotation.z = side * (0.48 + lift * 0.16);
        arm.elbow.rotation.z = side * (0.53 - lift * 0.22);
        arm.wrist.rotation.z =
          -arm.shoulder.rotation.z -
          arm.elbow.rotation.z +
          (side * Math.PI) / 2 +
          wave * 0.13;
        arm.fingers.forEach((f, i) => {
          f.rotation.z = (i ? 1 : -1) * (0.1 + 0.04 * Math.sin(t));
        });
      }
      root.updateMatrixWorld(true);
      const a = left.tip.getWorldPosition(vec()),
        b = right.tip.getWorldPosition(vec());
      cup.position.copy(a).lerp(b, 0.5);
      cup.rotation.z = wave * 0.16;
      cup.rotation.y = t * 0.12;
      return [left.shoulder.rotation.z, left.elbow.rotation.z, wave * 0.3];
    },
  };
}
function folding(template) {
  const root = new THREE.Group(),
    rig = new RobotRig(template);
  root.add(rig.root);
  const tableSurface = new THREE.MeshBasicMaterial({ color: 0xdadbe5 });
  box(root, [1.8, 0.04, 0.6], [0, 0.69, 0.24], tableSurface);
  box(root, [1.8, 0.44, 0.035], [0, 0.45, 0.535], tableSurface);
  for (const x of [-0.46, 0.46])
    for (const z of [0.0, 0.49])
      box(root, [0.045, 0.69, 0.045], [x, 0.345, z], dark);
  const clothGeometry = new THREE.PlaneGeometry(0.6, 0.36, 24, 20);
  const cloth = mesh(
    root,
    clothGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xeeeef3,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
    [0, 0.718, 0.24],
  );
  const original = clothGeometry.attributes.position.array.slice();
  return {
    root,
    trackers: rig.trackers,
    update(t) {
      rig.neutral();
      rig.set("waist_pitch_joint", 0.12);
      const phase = (t % 6) / 6;
      const fold =
        smooth((phase - 0.12) / 0.5) * (1 - smooth((phase - 0.86) / 0.14));
      const angle = fold * Math.PI * 0.98;
      const positions = clothGeometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let x = original[i * 3],
          z = original[i * 3 + 1],
          y = 0;
        if (z > 0) {
          y = Math.sin(angle) * z;
          z = Math.cos(angle) * z;
        }
        y += Math.sin(x * 28 + fold * 4) * 0.006 * Math.sin(fold * Math.PI);
        positions.setXYZ(i, x, y, z);
      }
      positions.needsUpdate = true;
      clothGeometry.computeVertexNormals();
      const handZ = 0.24 + 0.18 * Math.cos(angle),
        handY = 0.75 + 0.18 * Math.sin(angle);
      for (const side of ["left", "right"]) {
        rig.set(`${side}_shoulder_pitch_joint`, -0.75);
        rig.set(`${side}_elbow_joint`, 0.65);
        rig.reach(side, vec(side === "left" ? 0.24 : -0.24, handY, handZ));
      }
      return [
        rig.joints.get("right_shoulder_pitch_joint").angle,
        rig.joints.get("right_elbow_joint").angle,
        fold,
      ];
    },
  };
}
function running(template) {
  const root = new THREE.Group(),
    rig = new RobotRig(template);
  root.add(rig.root);
  return {
    root,
    trackers: rig.trackers,
    update(t) {
      rig.neutral();
      const phase = t * 5.8;
      rig.pelvis.position.z = rig.pelvisOrigin.z + 0.045 * Math.cos(phase * 2);
      rig.set("waist_pitch_joint", 0.12);
      rig.set("waist_yaw_joint", 0.09 * Math.sin(phase));
      for (const [side, offset] of [
        ["left", 0],
        ["right", Math.PI],
      ]) {
        const a = phase + offset,
          s = Math.sin(a);
        rig.set(`${side}_hip_pitch_joint`, -0.1 + 0.6 * s);
        rig.set(`${side}_knee_joint`, 0.35 + 0.9 * Math.max(0, -Math.cos(a)));
        rig.set(`${side}_ankle_pitch_joint`, -0.2 - 0.2 * s);
        rig.set(`${side}_shoulder_pitch_joint`, -0.2 - 0.65 * s);
        rig.set(`${side}_shoulder_roll_joint`, side === "left" ? 0.16 : -0.16);
        rig.set(`${side}_elbow_joint`, 1.1 + 0.18 * Math.cos(a));
      }
      return [
        0.6 * Math.sin(phase),
        0.35 + 0.9 * Math.max(0, -Math.cos(phase)),
        0.09 * Math.sin(phase),
      ];
    },
  };
}

export async function loadScenes() {
  const gltf = await new GLTFLoader().loadAsync(
    `${import.meta.env.BASE_URL}models/humanoid.glb`,
  );
  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      node.material = node.material.clone();
      node.material.metalness = 0.25;
      node.material.roughness = 0.65;
    }
  });
  return new Map([
    ["harvest", harvest(gltf.scene)],
    ["transfer", transfer()],
    ["fold", folding(gltf.scene)],
    ["run", running(gltf.scene)],
  ]);
}
