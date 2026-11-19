import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(root, 'docs');
const pages = ['index.html', 'privacy.html'];
for (const page of pages) {
  const file = path.join(siteRoot, page);
  const html = fs.readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
  for (const [, attribute, value] of html.matchAll(/\b(href|src)=["']([^"']+)["']/g)) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value) || value.startsWith('//')) continue;
    const [pathname, fragment = ''] = value.split('#', 2);
    if (!pathname) {
      if (fragment && !ids.has(fragment)) throw new Error(`${page} links to missing #${fragment}`);
      continue;
    }
    const target = path.resolve(path.dirname(file), pathname.split('?')[0]);
    if (!target.startsWith(`${siteRoot}${path.sep}`) && target !== siteRoot) throw new Error(`${page} has an unsafe local ${attribute}: ${value}`);
    if (!fs.existsSync(target)) throw new Error(`${page} has a missing local ${attribute}: ${value}`);
    if (fragment && target.endsWith('.html')) {
      const targetIds = new Set([...fs.readFileSync(target, 'utf8').matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
      if (!targetIds.has(fragment)) throw new Error(`${page} links to missing ${pathname}#${fragment}`);
    }
  }
  if (!/name=["']viewport["']/.test(html)) throw new Error(`${page} is missing its responsive viewport meta tag.`);
}
const css = fs.readFileSync(path.join(siteRoot, 'site.css'), 'utf8');
if (!/@media\s*\(max-width:/.test(css) || !/prefers-reduced-motion/.test(css)) throw new Error('Responsive or reduced-motion website styles are missing.');
const config = fs.readFileSync(path.join(siteRoot, 'site-config.js'), 'utf8');
if (!/repositoryUrl:\s*'https:\/\/github\.com\/p4prince2\/SkipTube'/.test(config) || !/chromeWebStoreUrl:\s*''/.test(config)) throw new Error('Repository link should be configured; store link must remain disabled until publication.');
if (/<a\b[^>]*data-store-link[^>]*>/.test(fs.readFileSync(path.join(siteRoot, 'index.html'), 'utf8'))) throw new Error('Do not enable a store install button before publication.');
console.log(`Website links and local resources validated across ${pages.length} pages; repository links are enabled and store links remain disabled.`);
