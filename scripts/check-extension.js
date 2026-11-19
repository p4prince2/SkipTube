import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const required = [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page,
  ...manifest.content_scripts.flatMap(item => [...item.js, ...item.css]),
  ...Object.values(manifest.icons)];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Manifest resource missing: ${file}`);
if (manifest.manifest_version !== 3 || manifest.background.type !== 'module') throw new Error('Expected an MV3 module service worker.');
if (manifest.permissions.length !== 1 || manifest.permissions[0] !== 'storage') throw new Error('Review extension permissions; this build should only request storage.');
if (!manifest.host_permissions.includes('https://sponsor.ajay.app/*')) throw new Error('SponsorBlock host access is missing.');
for (const [size, icon] of Object.entries(manifest.icons)) {
  const bytes = fs.readFileSync(path.join(root, icon));
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`Invalid PNG icon: ${icon}`);
  if (bytes.readUInt32BE(16) !== Number(size) || bytes.readUInt32BE(20) !== Number(size)) throw new Error(`Icon dimensions do not match manifest size ${size}: ${icon}`);
}
const jsFiles = [];
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if (item.isDirectory() && ['.git', 'dist', 'node_modules'].includes(item.name)) continue; const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else if (item.name.endsWith('.js')) jsFiles.push(full); } }
walk(root);
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${path.relative(root, file)}: ${result.stderr}`);
}
console.log(`Manifest resources and icons valid; syntax checked ${jsFiles.length} source JavaScript files.`);
