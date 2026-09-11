import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const COMMAND_MODULE = path.resolve(__dirname, '../../../core/cli/command.js');

// Loads core/cli/command.js in a child process with `tsx/cjs` resolving to
// `resolveTo` (a path), to nothing (`null`: the module is absent, as in a
// built tree), or untouched (`undefined`: the real one). Module resolution is
// process-wide state, so a child process keeps each case isolated. The script
// runs from a file rather than `-e` because the CLI framework reads its
// program name from process.argv[1].
function loadCommandWith(tmpDir: string, resolveTo: string | null | undefined) {
  const script = `
    const Module = require('node:module');
    const resolveTo = ${JSON.stringify(resolveTo)};
    if (resolveTo !== undefined) {
      const original = Module._resolveFilename;
      Module._resolveFilename = function (request, ...rest) {
        if (request === 'tsx/cjs') {
          if (resolveTo === null) {
            const err = new Error("Cannot find module 'tsx/cjs'");
            err.code = 'MODULE_NOT_FOUND';
            throw err;
          }
          return resolveTo;
        }
        return original.call(this, request, ...rest);
      };
    }
    require(${JSON.stringify(COMMAND_MODULE)});
  `;
  const scriptPath = path.join(tmpDir, 'load-command.js');
  fs.writeFileSync(scriptPath, script);
  return spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
}

describe('CLI Command module', function () {
  let tmpDir: string;

  beforeAll(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cli-command-'));
  });

  afterAll(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads with the installed tsx loader', function () {
    const result = loadCommandWith(tmpDir, undefined);
    assert.equal(result.status, 0, result.stderr);
  });

  it('loads when tsx is absent, as in a built tree', function () {
    const result = loadCommandWith(tmpDir, null);
    assert.equal(result.status, 0, result.stderr);
  });

  it('still fails when tsx is installed but cannot load', function () {
    // A tsx whose own dependency is missing: the MODULE_NOT_FOUND comes from
    // inside the loader, not from looking it up, and must not be swallowed.
    const brokenLoader = path.join(tmpDir, 'broken-tsx-cjs.js');
    fs.writeFileSync(brokenLoader, "require('ghost-test-missing-tsx-dependency');\n");

    const result = loadCommandWith(tmpDir, brokenLoader);
    assert.notEqual(result.status, 0, 'a broken loader should not be ignored');
    assert.match(result.stderr, /Cannot find module 'ghost-test-missing-tsx-dependency'/);
  });
});
