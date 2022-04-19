class APIVersionCompatibilityService {
    constructor({sendEmail}) {
        this.sendEmail = sendEmail;
    }

    handleMismatch({acceptVersion, contentVersion, userAgent}) {
        const emailTemplate = `
            ${userAgent} integration expected Ghost version: ${acceptVersion}
            Current Ghost version: ${contentVersion}
        `;

        this.sendEmail(emailTemplate);
    }
}

module.exports = APIVersionCompatibilityService;
