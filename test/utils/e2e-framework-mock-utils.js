const errors = require('@tryghost/errors');
const sinon = require('sinon');
const assert = require('node:assert');

let mocks = {};
let emailCount = 0;

const mailService = require('../../core/server/services/mail/index');

const mockMail = () => {
    mocks.mail = sinon
        .stub(mailService.GhostMailer.prototype, 'send')
        .resolves('Mail is disabled');

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

const restore = () => {
    sinon.restore();
    mocks = {};
    emailCount = 0;
};

module.exports = {
    mockMail,
    restore,
    assert: {
        sentEmailCount,
        sentEmail
    }
};
