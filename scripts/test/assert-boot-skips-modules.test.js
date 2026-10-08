import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

import { ROOT_DIR } from '../lib/constants.js';
import { findLoadedModules, NOT_AT_BOOT } from '../lib/boot-modules.js';

const PRELOAD = path.join(ROOT_DIR, 'scripts/assert-boot-skips-modules.js');
const CORE_DIR = path.join(ROOT_DIR, 'ghost/core');

const run = (code) =>
  spawnSync(process.execPath, ['--import', PRELOAD, '-e', code], {
    cwd: CORE_DIR,
    encoding: 'utf8',
  });

const hasSharp = (() => {
  try {
    createRequire(path.join(CORE_DIR, 'package.json')).resolve('sharp');
    return true;
  } catch {
    return false;
  }
})();

describe('findLoadedModules', () => {
  const modules = [
    { name: 'one', reason: 'test', sharedObject: /libone\.so$/ },
    { name: 'two', reason: 'test', sharedObject: /two-[^/]+\.node$/ },
  ];

  it('reports only the modules whose shared objects are loaded', () => {
    const loaded = findLoadedModules(
      ['/usr/lib/libc.so.6', '/app/node_modules/two/two-linux-x64.node'],
      modules,
    );

    assert.deepStrictEqual(
      loaded.map(({ module, files }) => [module.name, files]),
      [['two', ['/app/node_modules/two/two-linux-x64.node']]],
    );
  });

  it('reports nothing when none are loaded', () => {
    assert.deepStrictEqual(findLoadedModules(['/usr/lib/libc.so.6'], modules), []);
  });

  it('recognises sharp on Linux and macOS', () => {
    for (const file of [
      '/app/node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.7',
      '/app/node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.5.node',
      '/app/node_modules/@img/sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.5.node',
    ]) {
      assert.deepStrictEqual(
        findLoadedModules([file], NOT_AT_BOOT).map(({ module }) => module.name),
        ['sharp'],
        file,
      );
    }
  });
});

describe('assert-boot-skips-modules', () => {
  it('passes when no listed module was loaded', () => {
    const result = run('process.exit(0)');
    assert.strictEqual(result.status, 0, result.stderr);
  });

  it('fails when sharp was loaded', { skip: !hasSharp && 'sharp is not installed' }, () => {
    const result = run("require('sharp'); process.exit(0)");
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /sharp was loaded during boot/);
  });
});
