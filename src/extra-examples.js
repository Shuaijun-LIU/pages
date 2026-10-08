import { referenceSites } from "./reference-sites.js";
const previews = import.meta.glob("../docs/previews/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
});

export const demoExamples = [
  {
    name: "Robot Hero",
    slug: "robot-hero",
    background: "#e1e8e7",
    description: {
      en: "A robot in an interactive 3D hero, with orbit controls and guided camera views.",
      zh: "可拖拽探索的机器人 3D 主视觉，配合预设镜头与导览。",
    },
    tags: {
      en: ["Three.js", "3D hero", "Camera tour"],
      zh: ["Three.js", "3D 主视觉", "镜头导览"],
    },
  },
  {
    name: "Robot Trajectory",
    slug: "robot-trajectory",
    background: "#e9e3db",
    description: {
      en: "An articulated arm with joint playback, a scrubber and a visible tool trajectory.",
      zh: "可拖动时间轴的机械臂关节回放，展示末端轨迹。",
    },
    tags: {
      en: ["Three.js", "Trajectory replay", "Orbit controls"],
      zh: ["Three.js", "轨迹回放", "视角交互"],
    },
  },
  {
    name: "Viser Replay",
    slug: "viser-replay",
    background: "#e4e8e1",
    description: {
      en: "A recorded robot scene with a native Viser timeline and a freely movable camera.",
      zh: "带原生 Viser 时间轴与自由视角的机器人场景回放。",
    },
    tags: {
      en: ["Viser", "Static replay", "Camera frusta"],
      zh: ["Viser", "静态回放", "相机视锥"],
    },
  },
];

export const extraExamples = [...demoExamples, ...referenceSites].map(
  (example) => ({
    ...example,
    preview: previews[`../docs/previews/${example.slug}.jpg`],
  }),
);
