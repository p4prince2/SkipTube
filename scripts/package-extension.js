import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const outputDir = path.join(root, 'dist');
const outputFile = path.join(outputDir, `SkipTube-${manifest.version}.zip`);
const files = [
  'manifest.json', 'background.js', 'content.js', 'content-app.js', 'content.css',
  'popup.html', 'popup.js', 'popup.css', 'options.html', 'options.js', 'options.css'
];
for (const folder of ['api', 'utils', 'icons']) {
  for (const entry of fs.readdirSync(path.join(root, folder), { withFileTypes: true })) {
    if (entry.isFile()) files.push(`${folder}/${entry.name}`);
  }
}
files.sort();
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }

const localParts = [], centralParts = [];
let offset = 0;
for (const relative of files) {
  const data = fs.readFileSync(path.join(root, relative));
  const name = Buffer.from(relative.replaceAll('\\', '/'), 'utf8');
  const checksum = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  localParts.push(local, name, data);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8); central.writeUInt16LE(0, 10); central.writeUInt32LE(checksum, 16);
  central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 38); central.writeUInt32LE(offset, 42);
  centralParts.push(central, name);
  offset += local.length + name.length + data.length;
}
const centralDirectory = Buffer.concat(centralParts);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDirectory.length, 12); end.writeUInt32LE(offset, 16);
fs.mkdirSync(outputDir, { recursive: true });
const archive = Buffer.concat([...localParts, centralDirectory, end]);
fs.writeFileSync(outputFile, archive);
const digest = crypto.createHash('sha256').update(archive).digest('hex');
fs.writeFileSync(`${outputFile}.sha256`, `${digest}  ${path.basename(outputFile)}\n`);
console.log(`Packaged ${files.length} runtime files: ${path.relative(root, outputFile)}`);
console.log(`SHA-256 ${digest}`);
