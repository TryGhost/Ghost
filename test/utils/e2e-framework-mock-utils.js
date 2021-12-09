const sinon = require('sinon');

const mailService = require('../../core/server/services/mail/index');

const stubMail = () => {
    return sinon
        .stub(mailService.GhostMailer.prototype, 'send')
        .resolves('Mail is disabled');
};

module.exports.stubMail = stubMail;
module.exports.restoreMocks = () => sinon.restore();
