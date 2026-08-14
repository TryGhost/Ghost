const assert = require('node:assert/strict');
const sinon = require('sinon');

const configUtils = require('../../utils/config-utils');
const labs = require('../../../core/shared/labs');
const flagOverrides = require('../../../core/shared/labs-flag-overrides');
const settingsCache = require('../../../core/shared/settings-cache');

function expectedLabsObject(obj) {
    let enabledFlags = {};

    labs.GA_KEYS.forEach((key) => {
        enabledFlags[key] = true;
    });

    enabledFlags = Object.assign(enabledFlags, obj);
    return enabledFlags;
}

describe('Labs Service', function () {
    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('can getAll, even if empty with enabled members', function () {
        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: true
        }));
    });

    it('respects the value in config over settings', function () {
        if (labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }

        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        configUtils.set('labs', {
            [flag]: false
        });
        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('labs').returns({
            [flag]: true,
            members: true
        });

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            [flag]: false,
            members: true
        }));

        assert.equal(labs.isSet(flag), false);
    });

    it('respects the value in config over GA keys', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }

        const gaKey = labs.GA_KEYS[0];

        configUtils.set('labs', {
            [gaKey]: false
        });

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            [gaKey]: false,
            members: true
        }));

        assert.equal(labs.isSet(gaKey), false);
    });

    it('members flag is true when members_signup_access setting is "all"', function () {
        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('members_signup_access').returns('all');

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: true
        }));

        assert.equal(labs.isSet('members'), true);
    });

    it('returns other allowlisted flags along with members', function () {
        if (labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }

        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('members_signup_access').returns('all');
        getSpy.withArgs('labs').returns({
            [flag]: false
        });

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: true,
            [flag]: false
        }));

        assert.equal(labs.isSet('members'), true);
        assert.equal(labs.isSet(flag), false);
    });

    it('members flag is false when members_signup_access setting is "none"', function () {
        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('members_signup_access').returns('none');

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: false
        }));

        assert.equal(labs.isSet('members'), false);
    });

    it('isSet returns false for undefined', function () {
        assert.equal(labs.isSet('bar'), false);
    });

    it('isSet always returns false for deprecated', function () {
        assert.equal(labs.isSet('subscribers'), false);
        assert.equal(labs.isSet('publicAPI'), false);
    });
});

describe('Labs Service - remote overrides', function () {
    afterEach(async function () {
        flagOverrides.clear();
        sinon.restore();
        await configUtils.restore();
    });

    it('overlays a remote override so an otherwise-off flag reads on', function () {
        if (labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }
        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        assert.equal(labs.isSet(flag), false);
        flagOverrides.replace({[flag]: true});
        assert.equal(labs.isSet(flag), true);
        assert.equal(labs.getAll()[flag], true);
    });

    it('lets a remote override kill a GA flag (kill switch)', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];

        // GA forces the flag on by default.
        assert.equal(labs.isSet(gaKey), true);

        flagOverrides.replace({[gaKey]: false});
        assert.equal(labs.isSet(gaKey), false);
        assert.equal(labs.getAll()[gaKey], false);
    });

    it('lets a remote override beat the DB settings value', function () {
        if (labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }
        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('labs').returns({[flag]: false});

        flagOverrides.replace({[flag]: true});
        assert.equal(labs.isSet(flag), true);
    });

    it('lets a local config.labs pin beat a remote override', function () {
        if (labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }
        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        // config pins the flag OFF; remote tries to turn it ON; config must win.
        configUtils.set('labs', {[flag]: false});
        flagOverrides.replace({[flag]: true});
        assert.equal(labs.isSet(flag), false);
    });

    it('never lets a remote override change the members flag', function () {
        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('members_signup_access').returns('all');

        flagOverrides.replace({members: false});

        // members is always recomputed from settings after the remote overlay.
        assert.equal(labs.isSet('members'), true);
    });

    it('is inert with no overrides set and after clearing', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];

        flagOverrides.replace({[gaKey]: false});
        flagOverrides.clear();
        assert.equal(labs.isSet(gaKey), true);
    });

    it('treats a non-object override payload as empty without throwing', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];

        flagOverrides.replace(null);
        flagOverrides.replace('nope');
        flagOverrides.replace(['x']);
        flagOverrides.replace(42);

        assert.equal(labs.isSet(gaKey), true);
    });

    it('lets config.labs beat a remote override for a GA key', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];

        // Without config, the remote `false` would kill this GA flag; the config
        // pin must override the remote entry and keep it on.
        configUtils.set('labs', {[gaKey]: true});
        flagOverrides.replace({[gaKey]: false});
        assert.equal(labs.isSet(gaKey), true);
    });

    it('applies multiple overrides in one payload key-by-key', function () {
        if (labs.GA_KEYS.length === 0 || labs.WRITABLE_KEYS_ALLOWLIST.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];
        const writable = labs.WRITABLE_KEYS_ALLOWLIST[0];

        flagOverrides.replace({[gaKey]: false, [writable]: true});
        assert.equal(labs.isSet(gaKey), false);
        assert.equal(labs.isSet(writable), true);
    });

    it('isolates stored overrides from later caller and getAll() mutation', function () {
        if (labs.GA_KEYS.length === 0) {
            this.skip();
            return;
        }
        const gaKey = labs.GA_KEYS[0];

        const payload = {[gaKey]: false};
        flagOverrides.replace(payload);
        payload[gaKey] = true; // mutating the caller's object must not affect stored state
        assert.equal(labs.isSet(gaKey), false);

        const all = labs.getAll();
        all[gaKey] = true; // mutating getAll() output must not affect stored state
        assert.equal(labs.isSet(gaKey), false);
    });
});

describe('Labs Service - Flag Integrity', function () {
    it('should have no duplicate flags across categories', function () {
        const allFlags = labs.getAllFlags();

        const duplicates = allFlags.filter((flag, index) => allFlags.indexOf(flag) !== index);

        assert.equal(duplicates.length, 0, `There are duplicate flags in the labs configuration: ${duplicates.join(', ')}`);
    });
});
