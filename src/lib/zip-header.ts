/*types*/

export type PluginHeader = {
  folder: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  requires?: string;
  requiresPhp?: string;
};

type Entry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

/*limits*/

const MAX_HEADER_FILE_BYTES = 2 * 1024 * 1024;
const MAX_CANDIDATES = 25;
const MAX_TAIL_BYTES = 65535 + 22;

/*zip reading*/

async function readEntries(file: File): Promise<Entry[]> {
  const tailStart = Math.max(0, file.size - MAX_TAIL_BYTES);
  const tail = new DataView(await file.slice(tailStart).arrayBuffer());

  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("This file is not a valid zip archive");

  const total = tail.getUint16(eocd + 10, true);
  const size = tail.getUint32(eocd + 12, true);
  const offset = tail.getUint32(eocd + 16, true);
  if (offset + size > file.size) throw new Error("The zip archive is corrupt");

  const directory = new DataView(await file.slice(offset, offset + size).arrayBuffer());
  const decoder = new TextDecoder();
  const entries: Entry[] = [];
  let position = 0;

  for (let n = 0; n < total; n++) {
    if (
      position + 46 > directory.byteLength ||
      directory.getUint32(position, true) !== 0x02014b50
    ) {
      throw new Error("The zip archive is corrupt");
    }
    const nameLength = directory.getUint16(position + 28, true);
    const extraLength = directory.getUint16(position + 30, true);
    const commentLength = directory.getUint16(position + 32, true);
    entries.push({
      method: directory.getUint16(position + 10, true),
      compressedSize: directory.getUint32(position + 20, true),
      uncompressedSize: directory.getUint32(position + 24, true),
      localOffset: directory.getUint32(position + 42, true),
      name: decoder.decode(
        new Uint8Array(directory.buffer, position + 46, nameLength),
      ),
    });
    position += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readEntry(file: File, entry: Entry): Promise<string> {
  if (entry.uncompressedSize > MAX_HEADER_FILE_BYTES) {
    throw new Error(`${entry.name} is too large to be a plugin file`);
  }
  const local = new DataView(
    await file.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer(),
  );
  if (local.getUint32(0, true) !== 0x04034b50) {
    throw new Error("The zip archive is corrupt");
  }
  const start = entry.localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
  const data = file.slice(start, start + entry.compressedSize);

  if (entry.method === 0) return await data.text();
  if (entry.method === 8) {
    const stream = data.stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return await new Response(stream).text();
  }
  throw new Error("Unsupported zip compression method");
}

/*plugin header*/

function headerField(source: string, label: string): string | undefined {
  const re = new RegExp(`^[ \\t/*#@]*${label}:[ \\t]*(.+?)[ \\t]*$`, "mi");
  const match = source.slice(0, 8192).match(re);
  return match ? match[1].replace(/\s*\*\/\s*$/, "").trim() : undefined;
}

export async function readPluginHeader(file: File): Promise<PluginHeader> {
  const entries = await readEntries(file);
  const candidates = entries
    .filter((entry) => /^[^/]+\/[^/]+\.php$/.test(entry.name))
    .slice(0, MAX_CANDIDATES);

  for (const entry of candidates) {
    const source = await readEntry(file, entry);
    const name = headerField(source, "Plugin Name");
    if (!name) continue;
    return {
      folder: entry.name.split("/")[0],
      name,
      version: headerField(source, "Version"),
      description: headerField(source, "Description"),
      author: headerField(source, "Author"),
      requires: headerField(source, "Requires at least"),
      requiresPhp: headerField(source, "Requires PHP"),
    };
  }

  throw new Error(
    "No WordPress plugin header found. The zip must contain a folder with the main plugin PHP file inside it.",
  );
}
