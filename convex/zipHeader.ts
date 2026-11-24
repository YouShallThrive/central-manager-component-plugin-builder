
/*limits*/

export const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_HEADER_FILE_BYTES = 2 * 1024 * 1024;
const MAX_CANDIDATES = 25;

/*zip reading*/

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function readEntries(buf: Buffer): ZipEntry[] {
  const minEocd = 22;
  const searchStart = Math.max(0, buf.length - (65535 + minEocd));
  let eocd = -1;
  for (let i = buf.length - minEocd; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("This file is not a valid zip archive");

  const total = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let n = 0; n < total; n++) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("The zip archive is corrupt");
    }
    const nameLength = buf.readUInt16LE(offset + 28);
    const extraLength = buf.readUInt16LE(offset + 30);
    const commentLength = buf.readUInt16LE(offset + 32);
    entries.push({
      method: buf.readUInt16LE(offset + 10),
      compressedSize: buf.readUInt32LE(offset + 20),
      uncompressedSize: buf.readUInt32LE(offset + 24),
      localOffset: buf.readUInt32LE(offset + 42),
      name: buf.toString("utf8", offset + 46, offset + 46 + nameLength),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export type Inflate = (data: Buffer, maxOutputLength: number) => Buffer;

function readEntry(buf: Buffer, entry: ZipEntry, inflate: Inflate): string {
  if (entry.uncompressedSize > MAX_HEADER_FILE_BYTES) {
    throw new Error(`${entry.name} is too large to be a plugin file`);
  }
  const base = entry.localOffset;
  if (buf.readUInt32LE(base) !== 0x04034b50) {
    throw new Error("The zip archive is corrupt");
  }
  const start = base + 30 + buf.readUInt16LE(base + 26) + buf.readUInt16LE(base + 28);
  const data = buf.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data.toString("utf8");
  if (entry.method === 8) {
    return inflate(data, MAX_HEADER_FILE_BYTES).toString("utf8");
  }
  throw new Error("Unsupported zip compression method");
}

/*plugin header*/

function headerField(source: string, label: string): string | undefined {
  const re = new RegExp(`^[ \\t/*#@]*${label}:[ \\t]*(.+?)[ \\t]*$`, "mi");
  const match = source.slice(0, 8192).match(re);
  return match ? match[1].replace(/\s*\*\/\s*$/, "").trim() : undefined;
}

export function inspectZipBuffer(buf: Buffer, inflate: Inflate) {
  const entries = readEntries(buf);

  const candidates = entries
    .filter((e) => /^[^/]+\/[^/]+\.php$/.test(e.name))
    .slice(0, MAX_CANDIDATES);

  for (const entry of candidates) {
    const source = readEntry(buf, entry, inflate);
    const name = headerField(source, "Plugin Name");
    if (!name) continue;

    return {
      folder: entry.name.split("/")[0],
      mainFile: entry.name,
      name,
      version: headerField(source, "Version"),
      description: headerField(source, "Description"),
      author: headerField(source, "Author"),
      requires: headerField(source, "Requires at least"),
      requiresPhp: headerField(source, "Requires PHP"),
      fileCount: entries.length,
    };
  }

  throw new Error(
    "No WordPress plugin header found. The zip must contain a folder with the main plugin PHP file inside it.",
  );
}
