const errors = require('@tryghost/errors');
const sinon = require('sinon');

let mocks = {};

const mailService = require('../../core/server/services/mail/index');

const mockMail = () => {
    mocks.mail = sinon
        .stub(mailService.GhostMailer.prototype, 'send')
        .resolves('Mail is disabled');

    return mocks.mail;
};

const assertMailSentTo = (email) => {
    if (!mocks.mail) {
        throw new errors.IncorrectUsageError({
            message: 'Cannot assert on mail when mail has not been mocked'
        });
    }
};

const restore = () => {
    sinon.restore();
    mocks = {};
};

module.exports = {
    mockMail,
    restore
};
