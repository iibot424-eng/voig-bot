import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

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

async function buildAll() {
  try {
    await rm("dist", { recursive: true, force: true });

    console.log("building client...");
    await viteBuild();

    console.log("building server...");
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    await esbuild({
      entryPoints: ["server/index.ts"],
      platform: "node",
      target: "node20",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
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

buildAll();
