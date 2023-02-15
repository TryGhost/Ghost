const DomainEvents = require('@tryghost/domain-events');
const labs = require('../../../shared/labs');

class SlackNotificationsServiceWrapper {
    /** @type {import('@tryghost/slack-notifications/lib/slack-notifications')} */
    #api;

    init() {
        if (this.#api) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const SlackNotificationsService = require('@tryghost/slack-notifications');
        const settingsCache = require('../../../shared/settings-cache');
        const config = require('../../../shared/config');

        this.#api = new SlackNotificationsService({
            DomainEvents,
            labs,
            settingsCache,
            config
        });

        this.#api.subscribeEvents();
    }
}

module.exports = new SlackNotificationsServiceWrapper();
