const DomainEvents = require('@tryghost/domain-events');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');

class SlackNotificationsServiceWrapper {
    /** @type {import('./SlackNotificationsService')} */
    #api;

    /**
     *
     * @param {object} deps
     * @param {string} deps.siteUrl
     * @param {boolean} deps.isEnabled
     * @param {URL} deps.webhookUrl
     * @param {number} deps.minThreshold
     *
     * @returns {import('./SlackNotificationsService')}
     */
    static create({siteUrl, isEnabled, webhookUrl, minThreshold}) {
        const SlackNotificationsService = require('./SlackNotificationsService');
        const SlackNotifications = require('./SlackNotifications');

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
                webhookUrl,
                minThreshold
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
        const minThreshold = hostSettings?.milestones?.minThreshold ? parseInt(hostSettings.milestones.minThreshold) : 0;

        this.#api = SlackNotificationsServiceWrapper.create({siteUrl, isEnabled, webhookUrl, minThreshold});

        this.#api.subscribeEvents();
    }
}

module.exports = new SlackNotificationsServiceWrapper();
