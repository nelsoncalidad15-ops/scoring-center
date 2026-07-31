import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("assets", { recursive: true });

await build({
  bundle: true,
  entryPoints: ["client/auth-client.mjs"],
  format: "iife",
  minify: true,
  outfile: "assets/auth-client.js",
  platform: "browser",
  sourcemap: false,
  target: ["es2020"],
});
