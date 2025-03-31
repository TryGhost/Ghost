const {MailEventService} = require('./MailEventService');
const MailEventRepository = require('./BookshelfMailEventRepository.js');

class MailEventsServiceWrapper {
    /**
     * @type {MailEventService}
     */
    service;

    async init() {
        const config = require('../../../shared/config');
        const labs = require('../../../shared/labs');
        const models = require('../../models');

        const repository = new MailEventRepository(models.MailEvent);

        this.service = new MailEventService(repository, config, labs);
    }
}

module.exports = new MailEventsServiceWrapper();
