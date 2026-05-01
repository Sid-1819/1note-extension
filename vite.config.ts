import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function manifestHostPermissionsPlugin(): Plugin {
  return {
    name: "manifest-host-permissions",
    closeBundle() {
      const raw = process.env.VITE_API_BASE_URL || "http://localhost:3000";
      let origin: string;
      try {
        origin = new URL(raw).origin;
      } catch {
        throw new Error(`Invalid VITE_API_BASE_URL: ${raw}`);
      }
      const manifestPath = path.join(rootDir, "dist", "manifest.json");
      const manifest = JSON.parse(
        fs.readFileSync(manifestPath, "utf8"),
      ) as { host_permissions?: string[] };
      manifest.host_permissions = [`${origin}/*`];
      fs.writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8",
      );
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [manifestHostPermissionsPlugin()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: path.resolve(rootDir, "src/content/index.ts"),
        background: path.resolve(rootDir, "src/background/index.ts"),
        popup: path.resolve(rootDir, "popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
});
