const path = require('path');
const VersionNotificationsDataService = require('./VersionNotificationsDataService');
const EmailContentGenerator = require('../lib/EmailContentGenerator');

class APIVersionCompatibilityService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.UserModel - ghost user model
     * @param {Object} options.ApiKeyModel -  ghost api key model
     * @param {Object} options.settingsService - ghost settings service
     * @param {(Object: {subject: String, to: String, text: String, html: String}) => Promise<any>} options.sendEmail - email sending function
     * @param {Function} options.getSiteUrl
     * @param {Function} options.getSiteTitle
    */
    constructor({UserModel, ApiKeyModel, settingsService, sendEmail, getSiteUrl, getSiteTitle}) {
        this.sendEmail = sendEmail;

        this.versionNotificationsDataService = new VersionNotificationsDataService({
            UserModel,
            ApiKeyModel,
            settingsService
        });

        this.emailContentGenerator = new EmailContentGenerator({
            getSiteUrl,
            getSiteTitle,
            templatesDir: path.join(__dirname, 'templates')
        });
    }

    /**
     * Version mismatch handler doing the logic of picking a template and sending a notification email
     * @param {Object} options
     * @param {string} options.acceptVersion - client's accept-version header value
     * @param {string} options.contentVersion - server's content-version header value
     * @param {string} options.apiKeyValue - key value (secret for Content API and kid for Admin API) used to access the API
     * @param {string} options.apiKeyType - key type used to access the API
     * @param {string} options.requestURL - url that was requested and failed compatibility test
     * @param {string} [options.userAgent] - client's user-agent header value
     */
    async handleMismatch({acceptVersion, contentVersion, apiKeyValue, apiKeyType, requestURL, userAgent = ''}) {
        if (!await this.versionNotificationsDataService.fetchNotification(acceptVersion)) {
            const integration = await this.versionNotificationsDataService.getIntegration(apiKeyValue, apiKeyType);

            // We couldn't find the integration
            if (!integration) {
                return;
            }

            const {
                name: integrationName,
                type: integrationType
            } = integration;

            // @NOTE: "internal" or "core" integrations (https://ghost.notion.site/Data-Types-e5dc54dd0078443f9afd6b2abda443c4)
            //        are maintained by Ghost team, so there is no sense notifying the instance owner about it's incompatibility.
            //        The other two integration types: "builtin" and "custom", is when we want to notify about incompatibility.
            if (['internal', 'core'].includes(integrationType)) {
                return;
            }

            const trimmedUseAgent = userAgent.split('/')[0];
            const emails = await this.versionNotificationsDataService.getNotificationEmails();

            for (const email of emails) {
                const template = (trimmedUseAgent === 'Zapier')
                    ? 'zapier-mismatch'
                    : 'generic-mismatch';

                const subject = (trimmedUseAgent === 'Zapier')
                    ? 'Attention required: One of your Zaps has failed'
                    : `Attention required: Your ${integrationName} integration has failed`;

                const {html, text} = await this.emailContentGenerator.getContent({
                    template,
                    data: {
                        acceptVersion,
                        contentVersion,
                        clientName: integrationName,
                        recipientEmail: email,
                        requestURL: requestURL
                    }
                });

                await this.sendEmail({
                    subject,
                    to: email,
                    html,
                    text
                });
            }

            await this.versionNotificationsDataService.saveNotification(acceptVersion);
        }
    }
}

module.exports = APIVersionCompatibilityService;
