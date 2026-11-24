import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

/*arguments*/

const slug = process.argv[2];
const outDir = resolve(process.argv[3] ?? "dist/plugins");
if (!slug) {
  console.error("Usage: node scripts/build-plugin.mjs <slug> [outDir]");
  process.exit(1);
}

/*source*/

const root = resolve("plugins");
const folder = join(root, slug);
if (!existsSync(folder)) {
  console.error(`plugins/${slug} does not exist`);
  process.exit(1);
}
const main = readFileSync(join(folder, `${slug}.php`), "utf8");
const version = main.match(/^[ \t*]*Version:\s*(.+)$/m)?.[1]?.trim();
if (!version) {
  console.error("No Version header found in the main plugin file");
  process.exit(1);
}

/*zip*/

mkdirSync(outDir, { recursive: true });
const target = join(outDir, `${slug}-${version}.zip`);
rmSync(target, { force: true });
const python = process.platform === "win32" ? "python" : "python3";
execFileSync(python, ["-m", "zipfile", "-c", target, slug], {
  cwd: root,
  stdio: "inherit",
});
console.log(target);
