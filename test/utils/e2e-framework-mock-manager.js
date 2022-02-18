const errors = require('@tryghost/errors');
const sinon = require('sinon');
const assert = require('assert');
const nock = require('nock');

// Helper services
const configUtils = require('./configUtils');

let mocks = {};
let emailCount = 0;

// Mockable services
const mailService = require('../../core/server/services/mail/index');
const labs = require('../../core/shared/labs');
const settingsCache = require('../../core/shared/settings-cache');

const mockMail = () => {
    mocks.mail = sinon
        .stub(mailService.GhostMailer.prototype, 'send')
        .resolves('Mail is disabled');

    return mocks.mail;
};

const mockStripe = () => {
    nock.disableNetConnect();
};

const setupStripe = () => {
    mocks.settings = sinon.stub(settingsCache, 'get').callsFake(function (key, ...args) {
        if (key === 'stripe_connect_secret_key') {
            return 'sk_test_blah';
        }
        if (key === 'stripe_connect_publishable_key') {
            return 'pk_test_blah';
        }
        if (key === 'stripe_connect_account_name') {
            return 'Test Account';
        }
        return settingsCache.get.wrappedMethod.call(settingsCache, key, ...args);
    });
};

const mockLabsEnabled = (flag, alpha = true) => {
    // We assume we should enable alpha experiments unless explicitly told not to!
    if (!alpha) {
        configUtils.set('enableDeveloperExperiments', true);
    }

    if (!mocks.labs) {
        mocks.labs = sinon.stub(labs, 'isSet');
    }

    mocks.labs.withArgs(flag).returns(true);
};

const mockLabsDisabled = (flag, alpha = true) => {
    // We assume we should enable alpha experiments unless explicitly told not to!
    if (!alpha) {
        configUtils.set('enableDeveloperExperiments', true);
    }

    if (!mocks.labs) {
        mocks.labs = sinon.stub(labs, 'isSet');
    }

    mocks.labs.withArgs(flag).returns(false);
};

const sentEmailCount = (count) => {
    if (!mocks.mail) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot assert on mail when mail has not been mocked'
        });
    }

    sinon.assert.callCount(mocks.mail, count);
};

const sentEmail = (matchers) => {
    if (!mocks.mail) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot assert on mail when mail has not been mocked'
        });
    }

    let spyCall = mocks.mail.getCall(emailCount);

    // We increment here so that the messaging has an index of 1, whilst getting the call has an index of 0
    emailCount += 1;

    sinon.assert.called(mocks.mail);

    Object.keys(matchers).forEach((key) => {
        let value = matchers[key];

        // We use assert, rather than sinon.assert.calledWith, as we end up with much better error messaging
        assert.notEqual(spyCall.args[0][key], undefined, `Expected email to have property ${key}`);
        assert.equal(spyCall.args[0][key], value, `Expected Email ${emailCount} to have ${key} of ${value}`);
    });
};

const restore = () => {
    configUtils.restore();
    sinon.restore();
    mocks = {};
    emailCount = 0;
    nock.cleanAll();
    nock.enableNetConnect();
};

module.exports = {
    mockMail,
    setupStripe,
    mockStripe,
    mockLabsEnabled,
    mockLabsDisabled,
    restore,
    assert: {
        sentEmailCount,
        sentEmail
    }
};
