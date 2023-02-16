const DomainEvents = require('@tryghost/domain-events');

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
        const hostSettings = config.get('hostSettings');
        const urlUtils = require('../../../shared/url-utils');
        const logging = require('@tryghost/logging');
        const labs = require('../../../shared/labs');

        const siteUrl = urlUtils.getSiteUrl();
        const isEnabled = labs.isSet('milestoneEmails') && hostSettings?.milestones?.enabled && hostSettings?.milestones?.url;

        this.#api = new SlackNotificationsService({
            DomainEvents,
            logging,
            config: {
                isEnabled,
                webhookUrl: hostSettings.milestones.url
            },
            siteUrl
        });

        this.#api.subscribeEvents();
    }
}

module.exports = new SlackNotificationsServiceWrapper();
