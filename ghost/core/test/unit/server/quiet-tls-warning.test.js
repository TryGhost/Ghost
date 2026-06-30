const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

// quiet-tls-warning.js mutates process state (adds a 'warning' listener), so we
// exercise it in a forked Node process to keep the test isolated and to actually
// observe what's printed to stderr at boot.
function runHarness({rejectUnauthorized, extraEmitName, extraEmitMessage}) {
    const harnessPath = path.join(__dirname, 'fixtures', 'quiet-tls-warning-harness.js');
    const env = {
        ...process.env,
        EXTRA_WARNING_NAME: extraEmitName || '',
        EXTRA_WARNING_MESSAGE: extraEmitMessage || ''
    };
    if (rejectUnauthorized !== undefined) {
        env.NODE_TLS_REJECT_UNAUTHORIZED = rejectUnauthorized;
    } else {
        delete env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
    const result = spawnSync(process.execPath, [harnessPath], {env, encoding: 'utf8'});
    return {stdout: result.stdout, stderr: result.stderr, status: result.status};
}

describe('quiet-tls-warning', function () {
    it('replaces the Node TLS warning with a single INFO line when the env var is "0"', function () {
        const {stderr, status} = runHarness({rejectUnauthorized: '0'});

        assert.equal(status, 0, `harness exited non-zero. stderr:\n${stderr}`);
        // The replacement line is present...
        assert.ok(
            stderr.includes('[dev] TLS verification disabled for localhost development'),
            `expected replacement INFO line, got:\n${stderr}`
        );
        // ...and Node's two-line warning + trace-warnings follow-up is gone.
        assert.ok(
            !stderr.includes('NODE_TLS_REJECT_UNAUTHORIZED'),
            `expected Node TLS warning to be suppressed, got:\n${stderr}`
        );
        assert.ok(
            !stderr.includes('Use `node --trace-warnings'),
            `expected trace-warnings follow-up to be suppressed, got:\n${stderr}`
        );
    });

    it('still surfaces other process warnings', function () {
        const {stderr, status} = runHarness({
            rejectUnauthorized: '0',
            extraEmitName: 'DeprecationWarning',
            extraEmitMessage: 'something-else-is-deprecated'
        });

        assert.equal(status, 0, `harness exited non-zero. stderr:\n${stderr}`);
        assert.ok(
            stderr.includes('DeprecationWarning: something-else-is-deprecated'),
            `expected unrelated DeprecationWarning to be re-emitted, got:\n${stderr}`
        );
        // And the TLS warning is still filtered.
        assert.ok(
            !stderr.includes('NODE_TLS_REJECT_UNAUTHORIZED'),
            `expected Node TLS warning to be suppressed, got:\n${stderr}`
        );
    });

    it('does nothing when NODE_TLS_REJECT_UNAUTHORIZED is unset', function () {
        const {stderr, status} = runHarness({rejectUnauthorized: undefined});

        assert.equal(status, 0, `harness exited non-zero. stderr:\n${stderr}`);
        assert.ok(
            !stderr.includes('[dev] TLS verification disabled'),
            `expected no INFO line when env var is unset, got:\n${stderr}`
        );
    });
});
