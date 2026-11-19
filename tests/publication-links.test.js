import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryUrl = 'https://github.com/p4prince2/SkipTube';

test('website reveals repository links, routes contributions to issues, and keeps store links hidden', () => {
  const makeLink = className => ({
    classList: { contains: value => value === className },
    href: '', hidden: true, rel: ''
  });
  const repositoryLinks = [makeLink('repo-link'), makeLink('contribute-link')];
  const storeLinks = [makeLink('store-link')];
  const document = { querySelectorAll: selector => selector === '[data-repo-link]' ? repositoryLinks : storeLinks };
  const window = {};
  const configSource = fs.readFileSync(path.join(root, 'docs/site-config.js'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'docs/site.js'), 'utf8');
  vm.runInNewContext(configSource, { window });
  assert.equal(window.SKIPTUBE_SITE.repositoryUrl, repositoryUrl);
  assert.equal(window.SKIPTUBE_SITE.chromeWebStoreUrl, '');
  vm.runInNewContext(source, { window, document });

  assert.equal(repositoryLinks[0].href, repositoryUrl);
  assert.equal(repositoryLinks[0].hidden, false);
  assert.equal(repositoryLinks[0].rel, 'noreferrer');
  assert.equal(repositoryLinks[1].href, `${repositoryUrl}/issues/new`);
  assert.equal(repositoryLinks[1].hidden, false);
  assert.equal(storeLinks[0].hidden, true);
});

test('popup GitHub link is configured and opens the repository in a new tab', () => {
  const popupScript = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
  const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
  assert.match(popupScript, /const REPOSITORY_URL = 'https:\/\/github\.com\/p4prince2\/SkipTube';/);
  assert.match(popupScript, /configureRepositoryLink\(\$\('#github'\), REPOSITORY_URL\)/);
  assert.match(popupHtml, /id="github" target="_blank" rel="noreferrer" hidden/);
});
