const config = require('../../../shared/config');
const logging = require('@tryghost/logging');

class SlackNotificationsServiceWrapper {
    /** @type {import('@tryghost/slack-notifications/lib/SlackNotifications')} */
    api;

    /**
     *
     * @param {object} deps
     * @param {string} deps.siteUrl
     * @param {URL} deps.webhookUrl
     *
     * @returns {import('@tryghost/slack-notifications/lib/SlackNotifications')}
     */
    static create({siteUrl, webhookUrl}) {
        const {
            SlackNotifications
        } = require('@tryghost/slack-notifications');

        return new SlackNotifications({
            webhookUrl,
            siteUrl,
            logging
        });
    }

    init() {
        if (this.api) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const hostSettings = config.get('hostSettings');
        const urlUtils = require('../../../shared/url-utils');
        const siteUrl = urlUtils.getSiteUrl();
        const webhookUrl = hostSettings?.milestones?.url;

        this.api = SlackNotificationsServiceWrapper.create({siteUrl, webhookUrl});
    }
}

module.exports = new SlackNotificationsServiceWrapper();
