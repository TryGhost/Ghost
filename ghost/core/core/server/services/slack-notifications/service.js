const DomainEvents = require('@tryghost/domain-events');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');

class SlackNotificationsServiceWrapper {
    /** @type {import('@tryghost/slack-notifications/lib/SlackNotificationsService')} */
    #api;

    /**
     *
     * @param {object} deps
     * @param {string} deps.siteUrl
     * @param {boolean} deps.isEnabled
     * @param {URL} deps.webhookUrl
     *
     * @returns {import('@tryghost/slack-notifications/lib/SlackNotificationsService')}
     */
    static create({siteUrl, isEnabled, webhookUrl}) {
        const {
            SlackNotificationsService,
            SlackNotifications
        } = require('@tryghost/slack-notifications');

        const slackNotifications = new SlackNotifications({
            webhookUrl,
            siteUrl,
            logging
        });

        return new SlackNotificationsService({
            DomainEvents,
            logging,
            config: {
                isEnabled,
                webhookUrl
            },
            slackNotifications
        });
    }

    init() {
        if (this.#api) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const hostSettings = config.get('hostSettings');
        const urlUtils = require('../../../shared/url-utils');
        const siteUrl = urlUtils.getSiteUrl();
        const isEnabled = !!(hostSettings?.milestones?.enabled && hostSettings?.milestones?.url);
        const webhookUrl = hostSettings?.milestones?.url;

        this.#api = SlackNotificationsServiceWrapper.create({siteUrl, isEnabled, webhookUrl});

        this.#api.subscribeEvents();
    }
}

module.exports = new SlackNotificationsServiceWrapper();
