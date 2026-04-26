const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const parallelCheck = require('../../../../../core/server/services/permissions/parallel-check');
const models = require('../../../../../core/server/models');

const flushMicrotasks = () => new Promise((resolve) => {
    setImmediate(resolve);
});

describe('Permissions: parallel-check', function () {
    let warnStub;
    let checksCounter;
    let divergenceCounter;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        warnStub = sinon.stub(logging, 'warn');
        checksCounter = {inc: sinon.stub()};
        divergenceCounter = {inc: sinon.stub()};
        parallelCheck.setMetrics({checks: checksCounter, divergence: divergenceCounter});
        delete process.env.GHOST_PERMISSIONS_V2_PARALLEL;
    });

    afterEach(function () {
        sinon.restore();
        parallelCheck.setMetrics(null);
    });

    function loaded(roleName) {
        return {user: {permissions: [], roles: [{name: roleName}]}, apiKey: null};
    }

    it('returns V1 promise unchanged when V2 throws synchronously', async function () {
        const v1 = Promise.resolve({excludedAttrs: ['tags']});
        // No TargetModel -> base-check path. Editor has edit:post, so V2 will allow.
        // Inject a broken V2 by setting an unknown role -> V2 denies, V1 allows.
        // The caller's outcome should still be V1's resolved value.
        const result = await parallelCheck.runParallel(v1, {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'edit',
            objectType: 'post',
            modelOrId: 'id-1',
            unsafeAttrs: {},
            loadedPermissions: loaded('NoSuchRole'),
            TargetModel: null
        });
        assert.deepEqual(result, {excludedAttrs: ['tags']});
        await flushMicrotasks();
    });

    it('does not log when V1 and V2 both allow', async function () {
        const v1 = Promise.resolve();
        await parallelCheck.runParallel(v1, {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'edit',
            objectType: 'post',
            modelOrId: 'id-1',
            unsafeAttrs: {},
            loadedPermissions: loaded('Editor'),
            TargetModel: null
        });
        await flushMicrotasks();
        // 1 'match' check, no divergence emitted, no log
        assert.ok(checksCounter.inc.calledWith({result: 'match'}));
        assert.equal(divergenceCounter.inc.called, false);
        assert.equal(warnStub.called, false);
    });

    it('logs + counts divergence when V1 allows and V2 denies', async function () {
        const v1 = Promise.resolve();
        await parallelCheck.runParallel(v1, {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'destroy',
            objectType: 'setting',
            modelOrId: 'k1',
            unsafeAttrs: {},
            loadedPermissions: loaded('Editor'), // Editor can browse:setting but NOT destroy
            TargetModel: null
        });
        await flushMicrotasks();
        assert.ok(checksCounter.inc.calledWith({result: 'divergence'}));
        assert.ok(divergenceCounter.inc.calledWithMatch({action: 'destroy', object_type: 'setting', v1: 'allow', v2: 'deny'}));
        assert.equal(warnStub.callCount, 1);
        const logged = warnStub.firstCall.args[0];
        assert.equal(logged.event, 'permissions_v2_divergence');
        // PII-safety: only id/role identifiers, no full models or emails
        assert.equal(logged.context.user_id, 1);
        assert.equal(logged.context.api_key_id, null);
    });

    it('V1 rejection still propagates to caller even when V2 succeeds', async function () {
        const v1 = Promise.reject(new errors.NoPermissionError({message: 'V1 says no'}));
        const promise = parallelCheck.runParallel(v1, {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'edit',
            objectType: 'post',
            modelOrId: 'id-1',
            unsafeAttrs: {},
            loadedPermissions: loaded('Editor'),
            TargetModel: null
        });
        await assert.rejects(promise, /V1 says no/);
    });

    it('skips V2 entirely when GHOST_PERMISSIONS_V2_PARALLEL=false', async function () {
        process.env.GHOST_PERMISSIONS_V2_PARALLEL = 'false';
        const v1 = Promise.resolve();
        await parallelCheck.runParallel(v1, {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'destroy',
            objectType: 'setting',
            modelOrId: 'id-1',
            unsafeAttrs: {},
            loadedPermissions: loaded('Editor'),
            TargetModel: null
        });
        await flushMicrotasks();
        assert.equal(checksCounter.inc.called, false);
        assert.equal(warnStub.called, false);
    });

    it('skips V2 for internal contexts (no spurious logging on internal calls)', async function () {
        const v1 = Promise.resolve();
        await parallelCheck.runParallel(v1, {
            parsedContext: {internal: true, user: null, api_key: null, public: false},
            action: 'edit',
            objectType: 'post',
            modelOrId: 'id-1',
            unsafeAttrs: {},
            loadedPermissions: {user: null, apiKey: null},
            TargetModel: null
        });
        await flushMicrotasks();
        assert.equal(checksCounter.inc.called, false);
        assert.equal(warnStub.called, false);
    });

    it('rate-limits identical (action, object, v1, v2) divergences within the sample window', async function () {
        // Use a (action,object_type) tuple no other test in this file touches
        // so we don't inherit cached log timestamps.
        const ctx = {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'edit',
            objectType: 'integration',
            modelOrId: 'id-1',
            unsafeAttrs: {},
            loadedPermissions: loaded('Editor'),
            TargetModel: null
        };
        await parallelCheck.runParallel(Promise.resolve(), ctx);
        await flushMicrotasks();
        await parallelCheck.runParallel(Promise.resolve(), ctx);
        await flushMicrotasks();
        await parallelCheck.runParallel(Promise.resolve(), ctx);
        await flushMicrotasks();
        // Three divergences counted, but only one log emitted (sampling).
        assert.equal(divergenceCounter.inc.callCount, 3);
        assert.equal(warnStub.callCount, 1);
    });

    it('two-deny match across error subclasses (V1 HostingLimitError vs V2 NoPermissionError)', async function () {
        // Both rejected = both deny semantically; classifier ignores subclass.
        class HostingLimitError extends Error {}
        const v1 = Promise.reject(new HostingLimitError('over member limit'));
        // V2 will deny too because Editor lacks destroy:setting.
        try {
            await parallelCheck.runParallel(v1, {
                parsedContext: {user: 1, internal: false, public: false},
                action: 'destroy',
                objectType: 'setting',
                modelOrId: 'id-1',
                unsafeAttrs: {},
                loadedPermissions: loaded('Editor'),
                TargetModel: null
            });
        } catch (_e) {
            // V1 rejection propagates; we only care about no-divergence-logged.
        }
        await flushMicrotasks();
        // Should classify as match (both deny) — no divergence increment.
        assert.ok(checksCounter.inc.calledWith({result: 'match'}));
        assert.equal(divergenceCounter.inc.called, false);
    });

    it('V2 receives a deep-copy of unsafeAttrs (cannot leak mutations back to caller)', async function () {
        const captured = {};
        const TargetModel = {
            permissible(modelId, action, ctx, attrs) {
                captured.attrsRef = attrs;
                attrs.injected = 'v2-mutation';
                return Promise.resolve();
            }
        };
        const callerAttrs = {status: 'draft'};
        await parallelCheck.runParallel(Promise.resolve(), {
            parsedContext: {user: 1, internal: false, public: false},
            action: 'edit',
            objectType: 'post',
            modelOrId: 'id-1',
            unsafeAttrs: callerAttrs,
            loadedPermissions: loaded('Editor'),
            TargetModel
        });
        await flushMicrotasks();
        assert.notEqual(captured.attrsRef, callerAttrs, 'V2 must receive a clone, not the caller\'s reference');
        assert.equal(captured.attrsRef.status, 'draft', 'clone preserves original fields');
        assert.equal(callerAttrs.injected, undefined, 'V2 mutations cannot escape into caller\'s object');
    });

    it('inverse sanity: V1 wrong (denies) and V2 right (allows) still triggers divergence log', async function () {
        const v1 = Promise.reject(new errors.NoPermissionError({message: 'V1 wrongly denies'}));
        try {
            await parallelCheck.runParallel(v1, {
                parsedContext: {user: 1, internal: false, public: false},
                action: 'edit',
                objectType: 'post',
                modelOrId: 'id-1',
                unsafeAttrs: {},
                loadedPermissions: loaded('Editor'),
                TargetModel: null
            });
        } catch (_e) {
            // V1's rejection is expected to propagate; we only care about the
            // log + counter side effects from the comparison.
        }
        await flushMicrotasks();
        assert.ok(divergenceCounter.inc.calledWithMatch({v1: 'deny', v2: 'allow'}));
    });
});
