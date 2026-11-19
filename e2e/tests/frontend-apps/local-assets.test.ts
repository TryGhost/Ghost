import fs from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Ghost loads its frontend apps (Portal, Search, the admin toolbar, …) from
 * jsDelivr by default. E2E and dev serve the locally built bundles instead, so
 * each app needs a URL override and its build copied in, in several places.
 * Missing one only shows up when a test happens to render that app, as an
 * egress failure. These checks catch it when the app is added.
 */

const root = new URL('../../../', import.meta.url);
const read = (file: string) => fs.readFileSync(new URL(file, root), 'utf8');

const CDN_PREFIX = 'https://cdn.jsdelivr.net/ghost/';
const OVERRIDE = /(\w+)__(url|styles)[=:]\s*'?(\/ghost\/assets\/([\w-]+)\/[^\s'\\]+)/g;

interface Override {
  key: string;
  assetDir: string;
}

function cdnConfigKeys(): string[] {
  const defaults = JSON.parse(read('ghost/core/shared/config/defaults.json')) as Record<
    string,
    unknown
  >;
  const keys: string[] = [];
  for (const [app, value] of Object.entries(defaults)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    for (const [field, url] of Object.entries(value)) {
      if ((field === 'url' || field === 'styles') && String(url).startsWith(CDN_PREFIX)) {
        keys.push(`${app}__${field}`);
      }
    }
  }
  return keys.sort();
}

function overridesIn(file: string): Map<string, Override> {
  const overrides = new Map<string, Override>();
  for (const [, app, field, , assetDir] of read(file).matchAll(OVERRIDE)) {
    overrides.set(`${app}__${field}`, { key: `${app}__${field}`, assetDir });
  }
  return overrides;
}

function publicAppDirs(): string[] {
  return fs
    .readdirSync(new URL('apps/', root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const pkgUrl = new URL(`apps/${entry.name}/package.json`, root);
      if (!fs.existsSync(pkgUrl)) {
        return false;
      }
      const pkg = JSON.parse(fs.readFileSync(pkgUrl, 'utf8'));
      return (pkg.nx?.tags ?? []).includes('public-app');
    })
    .map((entry) => entry.name)
    .sort();
}

const cdnKeys = cdnConfigKeys();

test('defaults.json still points frontend apps at jsDelivr', () => {
  // Guards the parsing below: an empty list would make every other check pass.
  expect(cdnKeys).toContain('portal__url');
});

for (const file of [
  'e2e/Dockerfile.e2e',
  'docker/ghost-dev/Dockerfile',
  'tools/scripts/with-ghost-dev-env.ts',
]) {
  test(`${file} serves every frontend app locally`, () => {
    expect([...overridesIn(file).keys()].sort()).toEqual(cdnKeys);
  });
}

test('e2e/Dockerfile.e2e copies in the bundle each override points at', () => {
  const dockerfile = read('e2e/Dockerfile.e2e');
  const assetDirs = new Set([...overridesIn('e2e/Dockerfile.e2e').values()].map((o) => o.assetDir));
  for (const dir of assetDirs) {
    expect(dockerfile, `COPY for apps/${dir}/umd`).toContain(
      `COPY apps/${dir}/umd /home/ghost/core/built/admin/assets/${dir}`,
    );
  }
});

test('every public app is built into the e2e image', () => {
  const dockerfile = read('e2e/Dockerfile.e2e');
  const workflow = read('.github/workflows/ci.yml');
  for (const dir of publicAppDirs()) {
    expect(dockerfile, `Dockerfile.e2e COPY for apps/${dir}/umd`).toContain(
      `COPY apps/${dir}/umd `,
    );
    expect(workflow, `ci.yml e2e-public-apps tarball entry for apps/${dir}/umd`).toMatch(
      new RegExp(`^\\s+apps/${dir}/umd\\b`, 'm'),
    );
  }
});
