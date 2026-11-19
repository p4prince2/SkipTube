import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const archivePath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist', `SkipTube-${manifest.version}.zip`);
const archive = fs.readFileSync(archivePath);
const checksumPath = `${archivePath}.sha256`;
if (!fs.existsSync(checksumPath)) throw new Error(`SHA-256 sidecar missing: ${path.relative(root, checksumPath)}`);
const expectedDigest = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0];
const actualDigest = crypto.createHash('sha256').update(archive).digest('hex');
if (expectedDigest !== actualDigest) throw new Error('ZIP SHA-256 does not match its checksum sidecar.');
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }

let eocd = -1;
for (let i = archive.length - 22; i >= Math.max(0, archive.length - 65557); i--) if (archive.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
if (eocd < 0) throw new Error('ZIP end record not found.');
const count = archive.readUInt16LE(eocd + 10), directoryOffset = archive.readUInt32LE(eocd + 16);
const entries = new Map();
let cursor = directoryOffset;
for (let i = 0; i < count; i++) {
  if (archive.readUInt32LE(cursor) !== 0x02014b50) throw new Error(`Invalid central directory entry ${i}.`);
  const method = archive.readUInt16LE(cursor + 10), checksum = archive.readUInt32LE(cursor + 16);
  const compressed = archive.readUInt32LE(cursor + 20), uncompressed = archive.readUInt32LE(cursor + 24);
  const nameLength = archive.readUInt16LE(cursor + 28), extraLength = archive.readUInt16LE(cursor + 30), commentLength = archive.readUInt16LE(cursor + 32), localOffset = archive.readUInt32LE(cursor + 42);
  const name = archive.toString('utf8', cursor + 46, cursor + 46 + nameLength);
  if (name.startsWith('/') || name.split('/').includes('..')) throw new Error(`Unsafe archive path: ${name}`);
  if (method !== 0 || compressed !== uncompressed) throw new Error(`Unexpected ZIP compression for ${name}.`);
  if (archive.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Invalid local header for ${name}.`);
  const localNameLength = archive.readUInt16LE(localOffset + 26), localExtraLength = archive.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const data = archive.subarray(dataStart, dataStart + compressed);
  if (data.length !== uncompressed || crc32(data) !== checksum) throw new Error(`CRC or size mismatch for ${name}.`);
  entries.set(name, data);
  cursor += 46 + nameLength + extraLength + commentLength;
}
if (!entries.has('manifest.json')) throw new Error('manifest.json must be at the archive root.');
const packagedManifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
const required = [packagedManifest.background.service_worker, packagedManifest.action.default_popup, packagedManifest.options_page,
  ...packagedManifest.content_scripts.flatMap(item => [...item.js, ...item.css]), ...Object.values(packagedManifest.icons)];
for (const file of required) if (!entries.has(file)) throw new Error(`Required runtime file is missing from ZIP: ${file}`);
for (const name of entries.keys()) if (/^(\.git|tests|scripts|docs|dist|node_modules)\//.test(name) || name === 'package.json') throw new Error(`Development file included in ZIP: ${name}`);
for (const [name, data] of entries) {
  if (!name.endsWith('.js')) continue;
  const code = data.toString('utf8');
  for (const match of code.matchAll(/(?:from\s*|import\s*\()(['"])(\.{1,2}\/[^'"]+)\1/g)) {
    const imported = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[2]));
    if (!entries.has(imported)) throw new Error(`Module ${name} imports missing ${imported}.`);
  }
}
console.log(`Validated ${path.relative(root, archivePath)}: SHA-256, root manifest, ${entries.size} runtime files, required resources, import paths and CRCs.`);
