const assert = require('node:assert/strict');
const sinon = require('sinon');

const configUtils = require('../../utils/config-utils');
const labs = require('../../../core/shared/labs');
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

describe('Labs Service - Flag Integrity', function () {
    it('should have no duplicate flags across categories', function () {
        const allFlags = labs.getAllFlags();

        const duplicates = allFlags.filter((flag, index) => allFlags.indexOf(flag) !== index);

        assert.equal(duplicates.length, 0, `There are duplicate flags in the labs configuration: ${duplicates.join(', ')}`);
    });
});
