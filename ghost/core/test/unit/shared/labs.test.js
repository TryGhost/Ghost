const assert = require('node:assert/strict');
const sinon = require('sinon');

const configUtils = require('../../utils/config-utils');
const labs = require('../../../core/shared/labs');
const flagOverrides = require('../../../core/shared/labs-flag-overrides');
const settingsCache = require('../../../core/shared/settings-cache');

// The labs allowlists (`WRITABLE_KEYS_ALLOWLIST`, `GA_KEYS`) drain to empty
// once every flag in them graduates. Tests that pick the first allowlist
// entry must skip when that happens, or they reference undefined.
const itIfHasWritableFlag = it.skipIf(labs.WRITABLE_KEYS_ALLOWLIST.length === 0);
const itIfHasGaFlag = it.skipIf(labs.GA_KEYS.length === 0);
const itIfHasBothFlags = it.skipIf(labs.WRITABLE_KEYS_ALLOWLIST.length === 0 || labs.GA_KEYS.length === 0);

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

    itIfHasWritableFlag('respects the value in config over settings', function () {
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

    itIfHasGaFlag('respects the value in config over GA keys', function () {
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

    itIfHasWritableFlag('returns other allowlisted flags along with members', function () {
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

    itIfHasWritableFlag('overlays a remote override so an otherwise-off flag reads on', function () {
        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        assert.equal(labs.isSet(flag), false);
        flagOverrides.replace({[flag]: true});
        assert.equal(labs.isSet(flag), true);
        assert.equal(labs.getAll()[flag], true);
    });

    itIfHasGaFlag('lets a remote override kill a GA flag (kill switch)', function () {
        const gaKey = labs.GA_KEYS[0];

        // GA forces the flag on by default.
        assert.equal(labs.isSet(gaKey), true);

        flagOverrides.replace({[gaKey]: false});
        assert.equal(labs.isSet(gaKey), false);
        assert.equal(labs.getAll()[gaKey], false);
    });

    itIfHasWritableFlag('lets a remote override beat the DB settings value', function () {
        const flag = labs.WRITABLE_KEYS_ALLOWLIST[0];

        const getSpy = sinon.stub(settingsCache, 'get');
        getSpy.withArgs('labs').returns({[flag]: false});

        flagOverrides.replace({[flag]: true});
        assert.equal(labs.isSet(flag), true);
    });

    itIfHasWritableFlag('lets a local config.labs pin beat a remote override', function () {
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

    itIfHasGaFlag('is inert with no overrides set and after clearing', function () {
        const gaKey = labs.GA_KEYS[0];

        flagOverrides.replace({[gaKey]: false});
        flagOverrides.clear();
        assert.equal(labs.isSet(gaKey), true);
    });

    itIfHasGaFlag('treats a non-object override payload as empty without throwing', function () {
        const gaKey = labs.GA_KEYS[0];

        flagOverrides.replace(null);
        flagOverrides.replace('nope');
        flagOverrides.replace(['x']);
        flagOverrides.replace(42);

        assert.equal(labs.isSet(gaKey), true);
    });

    itIfHasGaFlag('lets config.labs beat a remote override for a GA key', function () {
        const gaKey = labs.GA_KEYS[0];

        // Without config, the remote `false` would kill this GA flag; the config
        // pin must override the remote entry and keep it on.
        configUtils.set('labs', {[gaKey]: true});
        flagOverrides.replace({[gaKey]: false});
        assert.equal(labs.isSet(gaKey), true);
    });

    itIfHasBothFlags('applies multiple overrides in one payload key-by-key', function () {
        const gaKey = labs.GA_KEYS[0];
        const writable = labs.WRITABLE_KEYS_ALLOWLIST[0];

        flagOverrides.replace({[gaKey]: false, [writable]: true});
        assert.equal(labs.isSet(gaKey), false);
        assert.equal(labs.isSet(writable), true);
    });

    itIfHasGaFlag('isolates stored overrides from later caller and getAll() mutation', function () {
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
