const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');

describe('MigratorConfig', function () {
    it('loads in a bare Node process', function () {
        assert.doesNotThrow(() => {
            execFileSync(process.execPath, ['-e', "require('./MigratorConfig.js')"], {
                cwd: path.join(__dirname, '../..'),
                stdio: 'pipe'
            });
        });
    });
});
