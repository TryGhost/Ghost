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
const events = require('../../core/server/lib/common/events');

/**
 * Stripe Mocks
 */

const disableStripe = async () => {
    // This must be required _after_ startGhost has been called, because the models will
    // not have been loaded otherwise. Consider moving the dependency injection of models
    // into the init method of the Stripe service.
    const stripeService = require('../../core/server/services/stripe');
    await stripeService.disconnect();
};

const mockStripe = () => {
    nock.disableNetConnect();
};

/**
 * Email Mocks & Assertions
 */

/**
 * @param {String|Object} response
 */
const mockMail = (response = 'Mail is disabled') => {
    mocks.mail = sinon
        .stub(mailService.GhostMailer.prototype, 'send')
        .resolves(response);

    return mocks.mail;
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

/**
 * Events Mocks & Assertions
 */

const mockEvents = () => {
    mocks.events = sinon.stub(events, 'emit');
};

const emittedEvent = (name) => {
    sinon.assert.calledWith(mocks.events, name);
};

/**
 * Labs Mocks
 */
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

const restore = () => {
    configUtils.restore();
    sinon.restore();
    mocks = {};
    emailCount = 0;
    nock.cleanAll();
    nock.enableNetConnect();
};

module.exports = {
    mockEvents,
    mockMail,
    disableStripe,
    mockStripe,
    mockLabsEnabled,
    mockLabsDisabled,
    restore,
    assert: {
        sentEmailCount,
        sentEmail,
        emittedEvent
    }
};
