const {MailEventService,MailEventRepository} = require('@tryghost/mail-events');

class MailEventsServiceWrapper {
    /** @type {MailEventService} */
    service;

    async init() {
        const config = require('../../../shared/config');
        const models = require('../../models');

        const siteId = config.get('hostSettings:siteId');
        const mailEventsSecretKey = config.get('hostSettings:mailEventsSecretKey');
        const payloadSigningKey = `${siteId}${mailEventsSecretKey}`;

        const repository = new MailEventRepository(models.MailEvent);

        this.service = new MailEventService(repository, payloadSigningKey);
    }
}

module.exports = new MailEventsServiceWrapper();
