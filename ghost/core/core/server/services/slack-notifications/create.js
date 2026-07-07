const logging = require('@tryghost/logging');
const SlackNotificationsService = require('./slack-notifications-service');
const SlackNotifications = require('./slack-notifications');

/**
 * @param {object} deps
 * @param {object} deps.domainEvents
 * @param {object} deps.urlUtils
 * @param {object} deps.siteConfig
 */
module.exports = function createSlackNotificationsService({domainEvents, urlUtils, siteConfig}) {
    const hostSettings = siteConfig.hostSettings;
    const siteUrl = urlUtils.getSiteUrl();
    const isEnabled = !!(hostSettings?.milestones?.enabled && hostSettings?.milestones?.url);
    const webhookUrl = hostSettings?.milestones?.url;
    const minThreshold = hostSettings?.milestones?.minThreshold ? parseInt(hostSettings.milestones.minThreshold) : 0;

    const slackNotifications = new SlackNotifications({
        webhookUrl,
        siteUrl,
        logging
    });

    const api = new SlackNotificationsService({
        DomainEvents: domainEvents,
        logging,
        config: {
            isEnabled,
            webhookUrl,
            minThreshold
        },
        slackNotifications
    });

    let initialized = false;

    return {
        api,
        init() {
            if (initialized) {
                // Prevent creating duplicate DomainEvents subscribers
                return;
            }
            initialized = true;
            api.subscribeEvents();
        }
    };
};
