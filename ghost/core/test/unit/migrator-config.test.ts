import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('MigratorConfig', function () {
  it('loads in a bare Node process', function () {
    assert.doesNotThrow(() => {
      execFileSync(process.execPath, ['-e', "require('./MigratorConfig.js')"], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
      });
    });
  });
});
