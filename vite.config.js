import { defineConfig } from "vite";
import { readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const entries = { collection: `${root}index.html` };
for (const directory of readdirSync(`${root}examples`, {
  withFileTypes: true,
})) {
  const entry = `${root}examples/${directory.name}/index.html`;
  if (directory.isDirectory() && existsSync(entry))
    entries[directory.name] = entry;
}
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    rollupOptions: {
      input: entries,
      output: { manualChunks: { three: ["three"] } },
    },
  },
});
