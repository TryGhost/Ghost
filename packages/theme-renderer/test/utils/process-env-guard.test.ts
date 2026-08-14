/**
 * The process-env guard (src/utils/process-env-guard.ts) must:
 * - install a minimal `process = {env: {}}` only when the global is absent
 *   (the browser/worker case — exercised against a fake scope so the Node
 *   runner's real `process` is never disturbed);
 * - install it configurable + writable so host realms can delete/replace it;
 * - leave an existing `process` completely untouched.
 */
import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {installProcessEnvGuard, type ProcessGlobalScope} from '../../src/utils/process-env-guard.ts';

describe('utils/process-env-guard', function () {
    it('installs a minimal process global when absent, configurable and deletable', function () {
        const scope: ProcessGlobalScope = {};
        installProcessEnvGuard(scope);

        assert.ok(scope.process, 'guard installed a process global');
        assert.deepEqual(scope.process.env, {});
        // The two upstream reads must resolve to undefined ("debug off")
        assert.equal(scope.process.env.NODE_DEBUG, undefined);
        assert.equal(scope.process.env.DEBUG, undefined);

        const descriptor = Object.getOwnPropertyDescriptor(scope, 'process');
        assert.equal(descriptor?.configurable, true, 'shim is configurable');
        assert.equal(descriptor?.writable, true, 'shim is writable');

        // Host realms can remove the shim again
        delete scope.process;
        assert.equal(scope.process, undefined);
    });

    it('leaves an existing process global untouched', function () {
        const existing = {env: {DEBUG: 'jison'}};
        const scope: ProcessGlobalScope = {process: existing};
        installProcessEnvGuard(scope);
        assert.equal(scope.process, existing);
        assert.equal(scope.process.env.DEBUG, 'jison');
    });

    it('was applied to globalThis on import without replacing the Node process', function () {
        // In Node the global already exists, so the module-load install is a no-op
        assert.equal(globalThis.process.env.NODE_ENV, 'testing');
    });
});
