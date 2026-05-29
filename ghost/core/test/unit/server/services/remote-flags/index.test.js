const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

const configUtils = require('../../../../utils/config-utils');
const labs = require('../../../../../core/shared/labs');
const resolve = require('../../../../../core/server/services/remote-flags/resolve');
const RemoteFlagsService = require('../../../../../core/server/services/remote-flags/remote-flags-service');
const remoteFlags = require('../../../../../core/server/services/remote-flags');

const URL = 'https://assets.example.com/platform/flags.json';

describe('remote-flags service index (gating)', function () {
    let startStub;

    beforeEach(function () {
        // Never make a real request during these tests.
        startStub = sinon.stub(RemoteFlagsService.prototype, 'start').resolves();
    });

    afterEach(async function () {
        remoteFlags.stop();
        sinon.restore();
        await configUtils.restore();
    });

    it('is inert when disabled, even with a url and a site id', function () {
        configUtils.set('remoteFlags', {enabled: false, url: URL});
        configUtils.set('hostSettings', {siteId: 42});

        const instance = remoteFlags.init();

        assert.equal(instance, null);
        assert.equal(startStub.called, false);
        assert.equal(remoteFlags.getInstance(), null);
    });

    it('is inert when enabled but no manifest url is configured', function () {
        configUtils.set('remoteFlags', {enabled: true});
        configUtils.set('hostSettings', {siteId: 42});

        assert.equal(remoteFlags.init(), null);
        assert.equal(startStub.called, false);
    });

    it('is inert on a non-Pro instance with no site id (self-hosted)', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL});
        // no hostSettings:siteId

        assert.equal(remoteFlags.init(), null);
        assert.equal(startStub.called, false);
    });

    it('is inert and warns when the configured url is not a valid URL', function () {
        const warnStub = sinon.stub(logging, 'warn');
        configUtils.set('remoteFlags', {enabled: true, url: 'not-a-url'});
        configUtils.set('hostSettings', {siteId: 42});

        assert.equal(remoteFlags.init(), null);
        assert.equal(startStub.called, false);
        assert.ok(warnStub.getCalls().some(c => c.args[0]?.system?.event === 'remote_flags.invalid_url'));
    });

    it('constructs and starts the service when enabled with a url and site id', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL});
        configUtils.set('hostSettings', {siteId: 42});

        const instance = remoteFlags.init();

        assert.ok(instance instanceof RemoteFlagsService);
        assert.equal(instance.url, URL);
        assert.equal(instance.siteId, 42);
        assert.equal(startStub.calledOnce, true);
        // wired to labs
        assert.deepEqual(instance.getKnownFlags(), labs.getAllFlags());
    });

    it('passes through configured pollInterval and jitter', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL, pollInterval: 123000, jitter: 4000});
        configUtils.set('hostSettings', {siteId: 7});

        const instance = remoteFlags.init();

        assert.equal(instance.pollInterval, 123000);
        assert.equal(instance.jitter, 4000);
    });

    it('is idempotent: a second init returns the same instance and starts once', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL});
        configUtils.set('hostSettings', {siteId: 42});

        const first = remoteFlags.init();
        const second = remoteFlags.init();

        assert.equal(first, second);
        assert.equal(startStub.calledOnce, true);
    });

    it('stop() stops the running service and allows a fresh init afterwards', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL});
        configUtils.set('hostSettings', {siteId: 42});

        const stopStub = sinon.stub(RemoteFlagsService.prototype, 'stop');
        const first = remoteFlags.init();
        remoteFlags.stop();

        assert.equal(stopStub.calledOnce, true);
        assert.equal(remoteFlags.getInstance(), null);

        const second = remoteFlags.init();
        assert.notEqual(second, first);
        assert.equal(startStub.calledTwice, true);
    });

    it('applyOverrides is wired to labs.setRemoteOverrides', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL});
        configUtils.set('hostSettings', {siteId: 42});

        const setStub = sinon.stub(labs, 'setRemoteOverrides');
        const instance = remoteFlags.init();
        instance.applyOverrides({flagA: true});

        assert.equal(setStub.calledOnceWithExactly({flagA: true}), true);
    });
});

describe('remote-flags integration: kill-switch through the real labs flag set', function () {
    afterEach(function () {
        labs.clearRemoteOverrides();
    });

    it('honors a remote kill of a real GA flag end-to-end', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];

        // Guards against a future change that drops GA keys from getAllFlags(): if
        // that happened, resolve() would skip the kill (unknown flag) and this fails.
        assert.equal(labs.isSet(gaKey), true);

        const resolved = resolve({[gaKey]: false}, {siteId: 1, knownFlags: labs.getAllFlags()});
        assert.deepEqual(resolved, {[gaKey]: false}, 'resolver must honor a GA flag key');

        labs.setRemoteOverrides(resolved);
        assert.equal(labs.isSet(gaKey), false, 'remote kill must flip a GA flag off end-to-end');
    });

    it('honors a remote enable of a real private/beta flag end-to-end', function () {
        if (labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }
        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        assert.equal(labs.isSet(flag), false);

        const resolved = resolve({[flag]: {value: true, percent: 100}}, {siteId: 1, knownFlags: labs.getAllFlags()});
        assert.deepEqual(resolved, {[flag]: true});

        labs.setRemoteOverrides(resolved);
        assert.equal(labs.isSet(flag), true);
    });
});
