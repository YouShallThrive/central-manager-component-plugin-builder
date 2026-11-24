import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/*settings*/

const dryRun = process.argv.includes("--dry");
const categories = { "yst-manager": "starter" };
const tmp = mkdtempSync(join(tmpdir(), "plugins-"));

/*plugin header*/

function headerField(source, label) {
  const re = new RegExp(`^[ \\t/*#@]*${label}:[ \\t]*(.+?)[ \\t]*$`, "mi");
  const match = source.slice(0, 8192).match(re);
  return match ? match[1].replace(/\s*\*\/\s*$/, "").trim() : undefined;
}

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
    const source = readFileSync(join("plugins", slug, `${slug}.php`), "utf8");
    const version = headerField(source, "Version");
    const name = headerField(source, "Plugin Name");
    if (!version || !name) throw new Error(`plugins/${slug}/${slug}.php has no plugin header`);

    const zip = execFileSync("node", ["scripts/build-plugin.mjs", slug, tmp], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .pop();

    const args = {
      base64: readFileSync(zip).toString("base64"),
      slug,
      version,
      name,
      description: headerField(source, "Description"),
      author: headerField(source, "Author"),
      requires: headerField(source, "Requires at least"),
      requiresPhp: headerField(source, "Requires PHP"),
      changelog: changelogFor(slug, version),
      category: categories[slug] ?? "custom",
    };

    if (dryRun) {
      console.log(slug, version, `${args.base64.length} base64 chars`, args.requires, args.requiresPhp);
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
