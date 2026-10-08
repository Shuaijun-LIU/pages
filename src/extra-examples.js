import { referenceSites } from "./reference-sites.js";
import { exampleGroups } from "./example-groups.js";
const previews = import.meta.glob("../docs/previews/*.jpg", { eager: true, query: "?url", import: "default" });
export const extraExamples = [exampleGroups[0], referenceSites[0], exampleGroups[1], referenceSites[1]].map(example => ({
  ...example, preview: previews[`../docs/previews/${example.previewSlug || example.slug}.jpg`],
}));
