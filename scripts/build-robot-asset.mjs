#!/usr/bin/env node
/**
 * CPU-only conversion of MuJoCo Menagerie's Unitree G1 visual meshes to glTF.
 * Usage: node scripts/build-robot-asset.mjs <menagerie/unitree_g1> [cell-size-metres]
 * Requires only the project's installed Three.js dependency and Node.js 20+.
 * Rebuilds public/models/humanoid.glb, its provenance, and the upstream license.
 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const [sourceArgument, cellArgument = "0.0041"] = process.argv.slice(2);
if (!sourceArgument)
  throw new Error(
    "Usage: node scripts/build-robot-asset.mjs <menagerie/unitree_g1> [cell-size-metres]",
  );
const source = path.resolve(sourceArgument);
const cellSize = Number(cellArgument);
if (!(cellSize > 0 && cellSize <= 0.01))
  throw new Error(
    "Cell size must be greater than zero and at most 0.01 metres.",
  );
const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const output = path.join(project, "public/models");
const licenseOutput = path.join(project, "public/licenses");
const xmlBuffer = await readFile(path.join(source, "g1.xml"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const commit = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();

// This deliberately small parser handles the element/attribute-only MJCF input.
// Unsupported XML features fail rather than silently changing the model.
function parseMjcf(xml) {
  if (/<!DOCTYPE|<!\[CDATA\[/i.test(xml))
    throw new Error("Unsupported XML construct.");
  const root = { tag: "document", attrs: {}, children: [] };
  const stack = [root];
  for (const match of xml
    .replace(/<!--[\s\S]*?-->/g, "")
    .matchAll(/<([^>]+)>/g)) {
    const text = match[1].trim();
    if (text.startsWith("?")) continue;
    if (text.startsWith("/")) {
      if (stack.pop()?.tag !== text.slice(1).trim())
        throw new Error("Mismatched XML tags.");
      continue;
    }
    const tag = text.match(/^[\w:-]+/)?.[0];
    if (!tag) throw new Error("Unsupported XML tag.");
    const attrs = Object.fromEntries(
      [...text.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );
    const node = { tag, attrs, children: [] };
    stack.at(-1).children.push(node);
    if (!text.endsWith("/")) stack.push(node);
  }
  if (stack.length !== 1) throw new Error("Unclosed XML tag.");
  return root.children.find((node) => node.tag === "mujoco");
}
const mjcf = parseMjcf(xmlBuffer.toString("utf8"));
const child = (node, tag) => node.children.find((item) => item.tag === tag);
const numbers = (value, fallback) =>
  value ? value.trim().split(/\s+/).map(Number) : fallback;
const meshDefs = new Map(
  child(mjcf, "asset")
    .children.filter((node) => node.tag === "mesh")
    .map((node) => [
      node.attrs.name || path.parse(node.attrs.file).name,
      node.attrs,
    ]),
);

function applyTransform(object, attrs) {
  if (attrs.euler || attrs.axisangle || attrs.xyaxes || attrs.zaxis)
    throw new Error("Only quaternion orientations are supported.");
  object.position.fromArray(numbers(attrs.pos, [0, 0, 0]));
  const [w, x, y, z] = numbers(attrs.quat, [1, 0, 0, 0]);
  object.quaternion.set(x, y, z, w).normalize();
}

// Average vertices inside each spatial cell, retaining the original triangle
// winding. Welded, indexed meshes avoid the repeated vertices of source STL.
function clusterGeometry(sourceGeometry) {
  const input = sourceGeometry.getAttribute("position");
  const cells = new Map();
  const sums = [];
  const vertexMap = new Uint32Array(input.count);
  for (let i = 0; i < input.count; i++) {
    const x = input.getX(i),
      y = input.getY(i),
      z = input.getZ(i);
    const key = `${Math.round(x / cellSize)},${Math.round(y / cellSize)},${Math.round(z / cellSize)}`;
    let index = cells.get(key);
    if (index === undefined) {
      index = sums.length;
      cells.set(key, index);
      sums.push([0, 0, 0, 0]);
    }
    const sum = sums[index];
    sum[0] += x;
    sum[1] += y;
    sum[2] += z;
    sum[3]++;
    vertexMap[i] = index;
  }
  const positions = sums.map(([x, y, z, count]) => [
    x / count,
    y / count,
    z / count,
  ]);
  const triangles = [];
  const seen = new Set();
  for (let i = 0; i < input.count; i += 3) {
    const a = vertexMap[i],
      b = vertexMap[i + 1],
      c = vertexMap[i + 2];
    if (a === b || b === c || a === c) continue;
    const p = positions[a],
      q = positions[b],
      r = positions[c];
    const u = q.map((v, j) => v - p[j]),
      v = r.map((n, j) => n - p[j]);
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    if (cross.reduce((sum, value) => sum + value * value, 0) < 1e-20) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    triangles.push(a, b, c);
  }
  const used = new Map();
  const compact = [];
  const indices = triangles.map((index) => {
    if (!used.has(index)) {
      used.set(index, used.size);
      compact.push(...positions[index]);
    }
    return used.get(index);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(compact, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

const meshRecords = [];
const geometries = new Map();
const loader = new STLLoader();
async function getGeometry(name) {
  if (geometries.has(name)) return geometries.get(name);
  const def = meshDefs.get(name);
  if (!def) throw new Error(`Missing mesh definition: ${name}`);
  const data = await readFile(path.join(source, "assets", def.file));
  const original = loader.parse(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  );
  const scale = numbers(def.scale, [1, 1, 1]);
  original.scale(...scale);
  const geometry = clusterGeometry(original);
  meshRecords.push({
    name,
    file: `assets/${def.file}`,
    sha256: sha256(data),
    sourceTriangles: original.attributes.position.count / 3,
    triangles: geometry.index.count / 3,
    vertices: geometry.attributes.position.count,
  });
  original.dispose();
  geometries.set(name, geometry);
  return geometry;
}

const materials = new Map(
  child(mjcf, "asset")
    .children.filter((node) => node.tag === "material")
    .map((node) => {
      const [r, g, b, opacity] = numbers(node.attrs.rgba, [0.7, 0.7, 0.7, 1]);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(r, g, b),
        metalness: node.attrs.name === "metal" ? 0.32 : 0.08,
        roughness: node.attrs.name === "metal" ? 0.48 : 0.62,
        opacity,
        transparent: opacity < 1,
      });
      material.name = node.attrs.name;
      return [node.attrs.name, material];
    }),
);
const joints = [];
async function buildBody(def) {
  const body = new THREE.Group();
  body.name = def.attrs.name;
  applyTransform(body, def.attrs);
  const joint = child(def, "joint");
  if (joint) {
    if (
      joint.attrs.pos &&
      numbers(joint.attrs.pos, []).some((value) => value !== 0)
    )
      throw new Error("Non-origin joint pivots need a separate pivot node.");
    body.userData = {
      jointName: joint.attrs.name,
      jointAxis: numbers(joint.attrs.axis, [0, 0, 1]),
      jointRange: numbers(joint.attrs.range, []),
      bindQuaternion: body.quaternion.toArray(),
    };
    joints.push({ node: body.name, ...body.userData });
  }
  const freeJoint = child(def, "freejoint");
  if (freeJoint) body.userData.freeJointName = freeJoint.attrs.name;
  for (const geom of def.children.filter(
    (node) =>
      node.tag === "geom" &&
      node.attrs.class === "visual" &&
      node.attrs.mesh !== "logo_link",
  )) {
    const mesh = new THREE.Mesh(
      await getGeometry(geom.attrs.mesh),
      materials.get(geom.attrs.material || "metal"),
    );
    mesh.name = `${geom.attrs.mesh}_visual`;
    mesh.userData.sourceMesh = geom.attrs.mesh;
    applyTransform(mesh, geom.attrs);
    body.add(mesh);
  }
  for (const nested of def.children.filter((node) => node.tag === "body"))
    body.add(await buildBody(nested));
  return body;
}

const scene = new THREE.Scene();
scene.name = "Unitree_G1";
const frame = new THREE.Group();
frame.name = "coordinate_frame_y_up_z_forward";
frame.quaternion
  .setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
  .multiply(
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2,
    ),
  );
frame.userData = {
  sourceUp: "+Z",
  sourceForward: "+X",
  up: "+Y",
  forward: "+Z",
  units: "metres",
};
scene.add(frame);
for (const body of child(mjcf, "worldbody").children.filter(
  (node) => node.tag === "body",
))
  frame.add(await buildBody(body));
scene.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(scene, true);
const up = new THREE.Vector3(0, 0, 1).applyQuaternion(frame.quaternion);
const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(frame.quaternion);
if (
  up.distanceTo(new THREE.Vector3(0, 1, 0)) > 1e-8 ||
  forward.distanceTo(new THREE.Vector3(0, 0, 1)) > 1e-8
)
  throw new Error("Coordinate conversion failed.");

// GLTFExporter uses browser FileReader only to read its generated Blob.
globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
};
const glb = await new GLTFExporter().parseAsync(scene, {
  binary: true,
  trs: true,
  onlyVisible: true,
});
await mkdir(output, { recursive: true });
await mkdir(licenseOutput, { recursive: true });
await writeFile(path.join(output, "humanoid.glb"), Buffer.from(glb));
await copyFile(
  path.join(source, "LICENSE"),
  path.join(licenseOutput, "Unitree-G1-BSD.txt"),
);
const provenance = {
  name: "Unitree G1 29-DOF visual model",
  upstream:
    "https://github.com/google-deepmind/mujoco_menagerie/tree/" +
    commit +
    "/unitree_g1",
  commit,
  source: { file: "unitree_g1/g1.xml", sha256: sha256(xmlBuffer) },
  license: "BSD-3-Clause",
  copyright:
    'Copyright (c) 2016-2023 HangZhou YuShu TECHNOLOGY CO.,LTD. ("Unitree Robotics")',
  licenseFile: "../licenses/Unitree-G1-BSD.txt",
  conversion: {
    script: "scripts/build-robot-asset.mjs",
    threeRevision: THREE.REVISION,
    method:
      "CPU spatial vertex clustering; centroid representatives; degenerate and duplicate face removal; vertex welding; recomputed smooth normals",
    cellSizeMetres: cellSize,
    excluded: [
      "collision geometry",
      "logo_link",
      "lights",
      "sites",
      "inertials",
      "actuators",
      "sensors",
    ],
    coordinateFrame: frame.name,
    coordinateRotation: "Ry(-pi/2) * Rx(-pi/2)",
    units: "metres",
    jointAnimation:
      "localQuaternion = bindQuaternion * axisAngle(jointAxis, angleRadians)",
    pose: "MJCF zero-joint bind pose; source body transforms preserved",
  },
  totals: {
    meshes: meshRecords.length,
    joints: joints.length,
    vertices: meshRecords.reduce((sum, mesh) => sum + mesh.vertices, 0),
    sourceTriangles: meshRecords.reduce(
      (sum, mesh) => sum + mesh.sourceTriangles,
      0,
    ),
    triangles: meshRecords.reduce((sum, mesh) => sum + mesh.triangles, 0),
    glbBytes: glb.byteLength,
  },
  boundsMetres: {
    min: bounds.min.toArray(),
    max: bounds.max.toArray(),
    size: bounds.getSize(new THREE.Vector3()).toArray(),
  },
  joints,
  meshes: meshRecords,
};
await writeFile(
  path.join(output, "humanoid-source.json"),
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { ...provenance.totals, boundsMetres: provenance.boundsMetres },
    null,
    2,
  ),
);
