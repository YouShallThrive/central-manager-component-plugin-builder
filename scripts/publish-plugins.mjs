import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

/*settings*/

const dryRun = process.argv.includes("--dry");
const categories = { "yst-manager": "starter" };
const tmp = mkdtempSync(join(tmpdir(), "plugins-"));

/*changelog*/

function isHeading(line) {
  return line.startsWith("## ") || line.startsWith("### ");
}

function changelogFor(slug, version) {
  const lines = readFileSync(join("plugins", slug, "README.md"), "utf8").split(/\r?\n/);
  const start = lines.findIndex(
    (line) => isHeading(line) && line.replace(/^#+ /, "").split(" ")[0] === version,
  );
  if (start === -1) return undefined;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (isHeading(line)) break;
    body.push(line);
  }
  return body.join("\n").trim() || undefined;
}

/*publish*/

try {
  const slugs = readdirSync("plugins", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const slug of slugs) {
    const zip = execFileSync("node", ["scripts/build-plugin.mjs", slug, tmp], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .pop();
    const version = basename(zip).match(/-(\d[0-9A-Za-z.+-]*)\.zip$/)[1];
    const args = {
      base64: readFileSync(zip).toString("base64"),
      changelog: changelogFor(slug, version),
      category: categories[slug] ?? "custom",
    };
    if (dryRun) {
      console.log(slug, version, `${args.base64.length} base64 chars`, JSON.stringify(args.changelog));
      continue;
    }
    console.log(
      execFileSync(
        "./node_modules/.bin/convex",
        ["run", "pluginPublish:publishFromDeploy", JSON.stringify(args)],
        { encoding: "utf8" },
      ).trim(),
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
