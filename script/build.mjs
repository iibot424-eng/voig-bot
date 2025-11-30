#!/usr/bin/env node

import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const allowlist = [
  "@neondatabase/serverless",
  "connect-pg-simple",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-session",
  "memorystore",
  "passport",
  "passport-local",
  "telegraf",
  "ws",
  "zod",
  "zod-validation-error",
];

async function buildServer() {
  try {
    console.log("Cleaning dist...");
    await rm(path.join(projectRoot, "dist"), {
      recursive: true,
      force: true,
    });

    console.log("Reading package.json...");
    const pkgPath = path.join(projectRoot, "package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));

    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    console.log("Building server with esbuild...");
    await esbuild({
      entryPoints: [path.join(projectRoot, "server/index.ts")],
      platform: "node",
      target: "node20",
      bundle: true,
      format: "cjs",
      outfile: path.join(projectRoot, "dist/index.cjs"),
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: false,
      sourcemap: false,
      external: externals,
      logLevel: "info",
    });

    console.log("✅ Build successful!");
  } catch (err) {
    console.error("❌ Build failed:", err);
    process.exit(1);
  }
}

buildServer();
