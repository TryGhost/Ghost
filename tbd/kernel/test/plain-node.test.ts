import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const packageRoot = path.resolve(import.meta.dirname, '..');

// Ghost loads this package in production with plain Node and no loader. The test runner is more
// forgiving than Node: it accepts a named import from a CommonJS package, which Node refuses
// when it loads the module. So every module is also loaded the way production loads it.
describe('every module, loaded by Node with no loader', function () {
  for (const file of globSync('src/**/*.ts', { cwd: packageRoot })) {
    it(`loads ${file}`, function () {
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', `await import(${JSON.stringify(`./${file}`)});`],
        { cwd: packageRoot, encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } },
      );

      assert.equal(result.status, 0, result.stderr);
    });
  }
});
