const DomainEvents = require('@tryghost/domain-events');
const labs = require('../../../shared/labs');

class SlackNotificationsServiceWrapper {
    /** @type {import('@tryghost/slack-notifications/lib/SlackNotificationsService')} */
    #api;

    init() {
        if (this.#api) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const SlackNotificationsService = require('@tryghost/slack-notifications');
        const config = require('../../../shared/config');
        const urlUtils = require('../../../shared/url-utils');
        const logging = require('@tryghost/logging');

        this.#api = new SlackNotificationsService({
            DomainEvents,
            logging,
            labs,
            config,
            urlUtils
        });

        this.#api.subscribeEvents();
    }
}

module.exports = new SlackNotificationsServiceWrapper();
