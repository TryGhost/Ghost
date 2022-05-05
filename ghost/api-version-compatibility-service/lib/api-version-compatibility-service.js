const path = require('path');
const EmailContentGenerator = require('@tryghost/email-content-generator');

class APIVersionCompatibilityService {
    /**
     *
     * @param {Object} options
     * @param {(Object: {subject: String, to: String, text: String, html: String}) => Promise<any>} options.sendEmail - email sending function
     * @param {() => Promise<any>} options.fetchEmailsToNotify - email address to receive notifications
     * @param {(acceptVersion: String) => Promise<any>} options.fetchHandled - retrives already handled compatibility notifications
     * @param {(acceptVersion: String) => Promise<any>} options.saveHandled - persists already handled compatibility notifications
     * @param {Function} options.getSiteUrl
     * @param {Function} options.getSiteTitle
    */
    constructor({sendEmail, fetchEmailsToNotify, fetchHandled, saveHandled, getSiteUrl, getSiteTitle}) {
        this.sendEmail = sendEmail;
        this.fetchEmailsToNotify = fetchEmailsToNotify;
        this.fetchHandled = fetchHandled;
        this.saveHandled = saveHandled;

        this.emailContentGenerator = new EmailContentGenerator({
            getSiteUrl,
            getSiteTitle,
            templatesDir: path.join(__dirname, 'templates')
        });
    }

    async handleMismatch({acceptVersion, contentVersion, userAgent = ''}) {
        if (!await this.fetchHandled(acceptVersion)) {
            const trimmedUseAgent = userAgent.split('/')[0];
            const emails = await this.fetchEmailsToNotify();

            for (const email of emails) {
                const {html, text} = await this.emailContentGenerator.getContent({
                    template: 'generic-mismatch',
                    data: {
                        acceptVersion,
                        contentVersion,
                        clientName: trimmedUseAgent,
                        recipientEmail: email
                    }
                });

                await this.sendEmail({
                    subject: `Attention required: Your ${trimmedUseAgent} integration has failed`,
                    to: email,
                    html,
                    text
                });
            }

            await this.saveHandled(acceptVersion);
        }
    }
}

module.exports = APIVersionCompatibilityService;
