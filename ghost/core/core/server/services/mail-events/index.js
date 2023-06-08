const {MailEventService,MailEventRepository} = require('@tryghost/mail-events');
const {MailEvent: Model} = require('../../models/mail-event');
const config = require('../../../shared/config');

function createMailEventService() {
    const siteId = config.get('hostSettings:siteId');
    const mailEventsSecretKey = config.get('hostSettings:mailEventsSecretKey');
    const payloadSigningKey = `${siteId}${mailEventsSecretKey}`;

    const repository = new MailEventRepository(Model);
    const mailEventService = new MailEventService(repository, payloadSigningKey);

    return mailEventService;
}

module.exports = {
    createMailEventService
};
