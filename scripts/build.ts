import { writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { build } from "esbuild";
import glob from "tiny-glob";
import { defineManifest } from "../src/entrypoints/manifest";

export async function buildFile(pathExpressions: string[]) {
  const paths = (
    await Promise.all(
      pathExpressions.map(async (p) => {
        return p.includes("*") ? await glob(p) : [p];
      }),
    )
  ).flat();

  const entryPoints: string[] = [];
  let manifestPromise = Promise.resolve();
  for (const p of paths) {
    console.log("build", relative(".", p));
    if (p.endsWith("/manifest.ts")) {
      manifestPromise = writeManifest();
    } else {
      entryPoints.push(p);
    }
  }
  return Promise.all([manifestPromise, runEsbuild(entryPoints)]);
}

async function runEsbuild(entryPoints: string[]) {
  build({
    entryPoints,
    outdir: "dist",
    minify: false,
    bundle: true,
    define: {
      "process.env.NODE_ENV": `"${process.env.NODE_ENV ?? "development"}"`,
    },
  }).catch(() => console.error("failed to build", entryPoints));
}

async function writeManifest() {
  const manifestStr = JSON.stringify(defineManifest(), null, 2);
  await writeFile(
    "dist/manifest.json",
    new Uint8Array(Buffer.from(manifestStr)),
  ).catch((e) => console.error(e));
}

(async () => buildFile(["src/**/.*"]))();
