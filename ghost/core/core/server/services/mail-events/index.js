const {MailEventService} = require('@tryghost/mail-events');
const MailEventRepository = require('./BookshelfMailEventRepository.js');

class MailEventsServiceWrapper {
    /**
     * @type {MailEventService}
     */
    service;

    async init() {
        const config = require('../../../shared/config');
        const models = require('../../models');
        const payloadSigningKey = config.get('hostSettings:mailEventsPayloadSigningKey');
        const repository = new MailEventRepository(models.MailEvent);

        this.service = new MailEventService(repository, payloadSigningKey);
    }
}

module.exports = new MailEventsServiceWrapper();
