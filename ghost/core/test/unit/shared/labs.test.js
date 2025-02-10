const assert = require('assert/strict');
const sinon = require('sinon');

const configUtils = require('../../utils/configUtils');
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

    it('returns an alpha flag when dev experiments in toggled', function () {
        configUtils.set('enableDeveloperExperiments', true);
        sinon.stub(process.env, 'NODE_ENV').value('production');
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('labs').returns({
            NestPlayground: true
        });

        // NOTE: this test should be rewritten to test the alpha flag independently of the internal ALPHA_FEATURES list
        //       otherwise we end up in the endless maintenance loop and need to update it every time a feature graduates from alpha
        assert.deepEqual(labs.getAll(), expectedLabsObject({
            NestPlayground: true,
            members: true
        }));

        assert.equal(labs.isSet('members'), true);
        assert.equal(labs.isSet('NestPlayground'), true);
    });

    it('returns a falsy alpha flag when dev experiments in NOT toggled', function () {
        configUtils.set('enableDeveloperExperiments', false);
        sinon.stub(process.env, 'NODE_ENV').value('production');
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('labs').returns({
            NestPlayground: true
        });

        // NOTE: this test should be rewritten to test the alpha flag independently of the internal ALPHA_FEATURES list
        //       otherwise we end up in the endless maintenance loop and need to update it every time a feature graduates from alpha
        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: true
        }));

        assert.equal(labs.isSet('members'), true);
        assert.equal(labs.isSet('NestPlayground'), false);
    });

    it('respects the value in config over settings', function () {
        configUtils.set('labs', {
            collections: false
        });
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('labs').returns({
            collections: true,
            members: true
        });

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            collections: false,
            members: true
        }));

        assert.equal(labs.isSet('collections'), false);
    });

    it('respects the value in config over GA keys', function () {
        configUtils.set('labs', {
            audienceFeedback: false
        });

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            audienceFeedback: false,
            members: true
        }));

        assert.equal(labs.isSet('audienceFeedback'), false);
    });

    it('members flag is true when members_signup_access setting is "all"', function () {
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('members_signup_access').returns('all');

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: true
        }));

        assert.equal(labs.isSet('members'), true);
    });

    it('returns other allowlisted flags along with members', function () {
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('members_signup_access').returns('all');
        settingsCache.get.withArgs('labs').returns({
            activitypub: false
        });

        assert.deepEqual(labs.getAll(), expectedLabsObject({
            members: true,
            activitypub: false
        }));

        assert.equal(labs.isSet('members'), true);
        assert.equal(labs.isSet('activitypub'), false);
    });

    it('members flag is false when members_signup_access setting is "none"', function () {
        sinon.stub(settingsCache, 'get');
        settingsCache.get.withArgs('members_signup_access').returns('none');

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
