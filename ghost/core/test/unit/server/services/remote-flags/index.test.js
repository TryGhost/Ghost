const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

const configUtils = require('../../../../utils/config-utils');
const config = require('../../../../../core/shared/config');
const labs = require('../../../../../core/shared/labs');
const flagOverrides = require('../../../../../core/shared/labs-flag-overrides');
const {resolve} = require('../../../../../core/server/services/remote-flags/resolve');
const {RemoteFlagsService} = require('../../../../../core/server/services/remote-flags/remote-flags-service');
const remoteFlags = require('../../../../../core/server/services/remote-flags');

const URL_STRING = 'https://assets.example.com/platform/flags.json';

describe('remote-flags service index (gating)', function () {
    let startStub;

    beforeEach(function () {
        // Never make a real request during these tests.
        startStub = sinon.stub(RemoteFlagsService.prototype, 'start').resolves();
    });

    afterEach(async function () {
        remoteFlags.stop();
        flagOverrides.clear();
        sinon.restore();
        await configUtils.restore();
    });

    it('is inert when disabled, even with a url and a site id', function () {
        configUtils.set('remoteFlags', {enabled: false, url: URL_STRING});
        configUtils.set('hostSettings', {siteId: 42});

        const instance = remoteFlags.init(config, labs);

        assert.equal(instance, null);
        assert.equal(startStub.called, false);
        assert.equal(remoteFlags.getInstance(), null);
    });

    it('is inert when enabled but no manifest url is configured', function () {
        configUtils.set('remoteFlags', {enabled: true});
        configUtils.set('hostSettings', {siteId: 42});

        assert.equal(remoteFlags.init(config, labs), null);
        assert.equal(startStub.called, false);
    });

    it('is inert on a non-Pro instance with no site id (self-hosted)', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL_STRING});
        // no hostSettings:siteId

        assert.equal(remoteFlags.init(config, labs), null);
        assert.equal(startStub.called, false);
    });

    it('is inert and warns when the configured url is not a valid URL', function () {
        const warnStub = sinon.stub(logging, 'warn');
        configUtils.set('remoteFlags', {enabled: true, url: 'not-a-url'});
        configUtils.set('hostSettings', {siteId: 42});

        assert.equal(remoteFlags.init(config, labs), null);
        assert.equal(startStub.called, false);
        assert.ok(warnStub.getCalls().some(c => c.args[0]?.system?.event === 'remote_flags.invalid_url'));
    });

    it('constructs and starts the service when enabled with a url and site id', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL_STRING});
        configUtils.set('hostSettings', {siteId: 42});

        const instance = remoteFlags.init(config, labs);

        assert.ok(instance instanceof RemoteFlagsService);
        // The service is handed a ready URL object, not a raw string.
        assert.ok(instance.url instanceof URL);
        assert.equal(instance.url.href, URL_STRING);
        assert.equal(instance.siteId, 42);
        assert.equal(startStub.calledOnce, true);
        // wired to the injected labs flag set
        assert.deepEqual(instance.getKnownFlags(), labs.getAllFlags());
    });

    it('is idempotent: a second init returns the same instance and starts once', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL_STRING});
        configUtils.set('hostSettings', {siteId: 42});

        const first = remoteFlags.init(config, labs);
        const second = remoteFlags.init(config, labs);

        assert.equal(first, second);
        assert.equal(startStub.calledOnce, true);
    });

    it('stop() stops the running service and allows a fresh init afterwards', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL_STRING});
        configUtils.set('hostSettings', {siteId: 42});

        const stopStub = sinon.stub(RemoteFlagsService.prototype, 'stop');
        const first = remoteFlags.init(config, labs);
        remoteFlags.stop();

        assert.equal(stopStub.calledOnce, true);
        assert.equal(remoteFlags.getInstance(), null);

        const second = remoteFlags.init(config, labs);
        assert.notEqual(second, first);
        assert.equal(startStub.calledTwice, true);
    });

    it('applyOverrides writes through to the shared override store', function () {
        configUtils.set('remoteFlags', {enabled: true, url: URL_STRING});
        configUtils.set('hostSettings', {siteId: 42});

        const instance = remoteFlags.init(config, labs);
        instance.applyOverrides({flagA: true});

        assert.deepEqual(flagOverrides.getAll(), {flagA: true});
    });
});

describe('remote-flags integration: kill-switch through the real labs flag set', function () {
    afterEach(function () {
        flagOverrides.clear();
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

        flagOverrides.replace(resolved);
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

        flagOverrides.replace(resolved);
        assert.equal(labs.isSet(flag), true);
    });
});
