/*limits*/

export const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_TAIL_BYTES = 65535 + 22;
const MAX_ENTRIES = 20000;
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;

/*zip reading*/

export async function listZipNames(blob: Blob): Promise<string[]> {
  const tailStart = Math.max(0, blob.size - MAX_TAIL_BYTES);
  const tail = new DataView(await blob.slice(tailStart).arrayBuffer());

  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("This file is not a valid zip archive");

  const total = tail.getUint16(eocd + 10, true);
  const directorySize = tail.getUint32(eocd + 12, true);
  const directoryOffset = tail.getUint32(eocd + 16, true);
  if (total > MAX_ENTRIES || directoryOffset + directorySize > blob.size) {
    throw new Error("The zip archive is corrupt");
  }

  const directory = new DataView(
    await blob.slice(directoryOffset, directoryOffset + directorySize).arrayBuffer(),
  );
  const decoder = new TextDecoder();
  const names: string[] = [];
  let offset = 0;

  for (let n = 0; n < total; n++) {
    if (
      offset + 46 > directory.byteLength ||
      directory.getUint32(offset, true) !== CENTRAL_SIGNATURE
    ) {
      throw new Error("The zip archive is corrupt");
    }
    const nameLength = directory.getUint16(offset + 28, true);
    const extraLength = directory.getUint16(offset + 30, true);
    const commentLength = directory.getUint16(offset + 32, true);
    names.push(
      decoder.decode(new Uint8Array(directory.buffer, offset + 46, nameLength)),
    );
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}
