import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { assembleAdminAssets, prepareLegacyAdminAssets } from '../lib/admin-assets.ts';

let root: string;
function write(path: string, contents: string): void {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents);
}
function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}
function inventory(directory: string): Record<string, string> {
  const output: Record<string, string> = {};
  function visit(path: string): void {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const absolute = join(path, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else {
        output[relative(directory, absolute)] = readFileSync(absolute, 'utf8');
      }
    }
  }
  visit(directory);
  return output;
}
function legacyOptions(environment = 'development') {
  return {
    emberDist: join(root, 'apps/ember-admin/dist'),
    destination: join(root, 'ghost/core/core/built/admin'),
    activitypubDist: join(root, 'apps/activitypub/dist'),
    koenigDist: join(root, 'koenig/koenig-lexical/dist'),
    environment,
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ghost-admin-assets-'));
  write(
    'apps/ember-admin/dist/index.html',
    '<meta name="ghost-admin/config/environment" content="config"><script src="assets/ghost.js"></script>',
  );
  write('apps/ember-admin/dist/assets/ghost.js', 'ember');
  write('apps/ember-admin/dist/assets/ghost.css', 'legacy css');
  write(
    'apps/ember-admin/dist/assets/ghost.js.map',
    JSON.stringify({ sources: ['assets/ghost.js', 'vendor.js'] }),
  );
  write('apps/ember-admin/dist/assets/icons/unused.svg', 'excluded');
  write('apps/activitypub/dist/activitypub.js', 'activitypub');
  write('koenig/koenig-lexical/dist/koenig.js', 'koenig');
  write('koenig/koenig-lexical/dist/embed-renderer/index.html', 'isolated renderer');
  write(
    'apps/admin/dist/index.html',
    '<meta name="ghost-admin/config/environment" content="config"><script src="https://cdn.example/assets/ghost.js"></script><script src="./assets/react.js"></script>',
  );
  write('apps/admin/dist/assets/react.js', 'react');
  write('apps/admin/dist/assets/react.css', 'react css');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('Admin asset assembly', () => {
  it('preserves legacy development assets, sourcemaps and the ActivityPub symlink', () => {
    prepareLegacyAdminAssets(legacyOptions());
    assert.equal(
      read('ghost/core/core/built/admin/index.html'),
      read('apps/ember-admin/dist/index.html'),
    );
    assert.deepEqual(JSON.parse(read('ghost/core/core/built/admin/assets/ghost.js.map')).sources, [
      'ghost.js',
      'vendor.js',
    ]);
    assert.equal(existsSync(join(root, 'ghost/core/core/built/admin/assets/icons')), false);
    const activitypub = join(root, 'ghost/core/core/built/admin/assets/activitypub');
    assert.equal(lstatSync(activitypub).isSymbolicLink(), true);
    assert.equal(realpathSync(activitypub), realpathSync(join(root, 'apps/activitypub/dist')));
    assert.equal(read('ghost/core/core/built/admin/assets/koenig-lexical/koenig.js'), 'koenig');
    assert.equal(
      existsSync(join(root, 'ghost/core/core/built/admin/assets/koenig-lexical/embed-renderer')),
      false,
    );
  });

  it('keeps development assets readable when the workspace moves', () => {
    prepareLegacyAdminAssets(legacyOptions());
    const moved = `${root}-moved`;
    renameSync(root, moved);
    root = moved;
    assert.equal(
      read('ghost/core/core/built/admin/assets/activitypub/activitypub.js'),
      'activitypub',
    );
  });

  it('preserves the editor dev-server override', () => {
    prepareLegacyAdminAssets({ ...legacyOptions(), editorUrl: 'http://localhost:5175' });
    assert.equal(
      existsSync(join(root, 'ghost/core/core/built/admin/assets/koenig-lexical')),
      false,
    );
  });

  it('assembles identical preview and Core assets while preserving React HTML and CDN paths', () => {
    const html = read('apps/admin/dist/index.html');
    assembleAdminAssets(root);
    assert.equal(read('ghost/core/core/built/admin/index.html'), html);
    assert.deepEqual(
      inventory(join(root, 'apps/admin/dist')),
      inventory(join(root, 'ghost/core/core/built/admin')),
    );
    assert.equal(read('ghost/core/core/built/admin/assets/react.js'), 'react');
    assert.equal(read('ghost/core/core/built/admin/assets/ghost.js'), 'ember');
    assert.equal(
      read('ghost/core/core/built/admin/assets/activitypub/activitypub.js'),
      'activitypub',
    );
    assert.equal(
      lstatSync(join(root, 'ghost/core/core/built/admin/assets/activitypub')).isDirectory(),
      true,
    );
    assert.equal(read('ghost/core/core/built/embed-renderer/index.html'), 'isolated renderer');
    assert.equal(
      existsSync(join(root, 'apps/admin/dist/assets/koenig-lexical/embed-renderer')),
      false,
    );
  });

  it('preserves the editor URL override while still shipping the isolated renderer', () => {
    assembleAdminAssets(root, { editorUrl: 'http://localhost:5175' });
    assert.equal(
      existsSync(join(root, 'ghost/core/core/built/admin/assets/koenig-lexical')),
      false,
    );
    assert.equal(read('ghost/core/core/built/embed-renderer/index.html'), 'isolated renderer');
  });

  it('is repeatable and removes stale Core and renderer outputs', () => {
    write('ghost/core/core/built/admin/assets/stale.js', 'old');
    write('ghost/core/core/built/embed-renderer/stale.js', 'old');
    assembleAdminAssets(root);
    const first = inventory(join(root, 'ghost/core/core/built/admin'));
    assembleAdminAssets(root);
    assert.deepEqual(inventory(join(root, 'ghost/core/core/built/admin')), first);
    assert.equal(existsSync(join(root, 'ghost/core/core/built/embed-renderer/stale.js')), false);
    assert.deepEqual(readdirSync(join(root, 'ghost/core/core/built')).sort(), [
      'admin',
      'embed-renderer',
    ]);
  });

  it('fails before replacing output when a required build is missing', () => {
    write('ghost/core/core/built/admin/index.html', 'previous build');
    rmSync(join(root, 'koenig/koenig-lexical/dist/embed-renderer'), { recursive: true });
    assert.throws(() => assembleAdminAssets(root), /Admin asset input is missing/);
    assert.equal(read('ghost/core/core/built/admin/index.html'), 'previous build');
  });

  it('rejects an embed renderer leaked into React assets', () => {
    cpSync(
      join(root, 'koenig/koenig-lexical/dist/embed-renderer'),
      join(root, 'apps/admin/dist/assets/koenig-lexical/embed-renderer'),
      { recursive: true },
    );
    assert.throws(() => assembleAdminAssets(root), /must not be served with Admin assets/);
    assert.equal(existsSync(join(root, 'ghost/core/core/built/admin')), false);
  });

  it('keeps both Admin outputs readable after a restrictive umask', () => {
    const previous = process.umask(0o077);
    try {
      assembleAdminAssets(root);
    } finally {
      process.umask(previous);
    }
    for (const directory of ['apps/admin/dist', 'ghost/core/core/built/admin']) {
      assert.equal(statSync(join(root, directory)).mode & 0o777, 0o755);
      assert.equal(statSync(join(root, directory, 'assets/ghost.js')).mode & 0o777, 0o644);
    }
  });
});
