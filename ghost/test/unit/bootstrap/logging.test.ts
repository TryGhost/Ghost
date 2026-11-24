import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('bootstrap: logging', function () {
  // Run in a process of its own, so that bootstrap is the first to touch the package.
  it('builds the logger that require("@tryghost/logging") then returns', function () {
    const output = execFileSync(
      process.execPath,
      [
        '--conditions=source',
        '--import=tsx',
        '-e',
        `const config = require('./core/shared/config');
         const built = require('./bootstrap/logging').buildLogger(config);
         console.log(String(built === require('@tryghost/logging')));`,
      ],
      { cwd: path.join(__dirname, '../../..'), encoding: 'utf8' },
    );

    assert.equal(output.trim().split('\n').at(-1), 'true');
  });
});
