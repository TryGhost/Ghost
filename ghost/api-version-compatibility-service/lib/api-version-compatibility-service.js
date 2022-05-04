class APIVersionCompatibilityService {
    /**
     *
     * @param {Object} options
     * @param {Function} options.sendEmail - email sending function
     * @param {() => Promise<any>} options.fetchEmailsToNotify - email address to receive notifications
     * @param {(acceptVersion: String) => Promise<any>} options.fetchHandled - retrives already handled compatibility notifications
     * @param {(acceptVersion: String) => Promise<any>} options.saveHandled - persists already handled compatibility notifications
    */
    constructor({sendEmail, fetchEmailsToNotify, fetchHandled, saveHandled}) {
        this.sendEmail = sendEmail;
        this.fetchEmailsToNotify = fetchEmailsToNotify;
        this.fetchHandled = fetchHandled;
        this.saveHandled = saveHandled;
    }

    async handleMismatch({acceptVersion, contentVersion, userAgent = ''}) {
        if (!await this.fetchHandled(acceptVersion)) {
            const trimmedUseAgent = userAgent.split('/')[0];
            const emailTemplate = `
                ${trimmedUseAgent} integration expected Ghost version: ${acceptVersion}
                Current Ghost version: ${contentVersion}
            `;

            const emails = await this.fetchEmailsToNotify();
            for (const email of emails) {
                await this.sendEmail({
                    subject: `Attention required: Your ${trimmedUseAgent} integration has failed`,
                    to: email,
                    html: emailTemplate
                });
            }

            await this.saveHandled(acceptVersion);
        }
    }
}

module.exports = APIVersionCompatibilityService;
