class APIVersionCompatibilityService {
    /**
     *
     * @param {Object} options
     * @param {Function} options.sendEmail - email sending function
     * @param {(acceptVersion: String) => Promise<any>} options.fetchHandled - retrives already handled compatibility notifications
     * @param {(acceptVersion: String) => Promise<any>} options.saveHandled - persists already handled compatibility notifications
    */
    constructor({sendEmail, fetchHandled, saveHandled}) {
        this.sendEmail = sendEmail;
        this.fetchHandled = fetchHandled;
        this.saveHandled = saveHandled;
    }

    async handleMismatch({acceptVersion, contentVersion, userAgent}) {
        if (!await this.fetchHandled(acceptVersion)) {
            const emailTemplate = `
                ${userAgent} integration expected Ghost version: ${acceptVersion}
                Current Ghost version: ${contentVersion}
            `;

            await this.sendEmail(emailTemplate);
            await this.saveHandled(acceptVersion);
        }
    }
}

module.exports = APIVersionCompatibilityService;
