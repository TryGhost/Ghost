/* eslint-disable no-unused-vars */

class EmailService {
    constructor(dependencies) {
        // ...
    }

    async createEmail(post) {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Not implemented');
    }
    async retryEmail(email) {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Not implemented');
    }

    async previewEmail(post, newsletter, segment) {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Previewing an email has not been implemented yet. Turn off the email stability flag is you need this functionality.');
    }

    async sendTestEmail(post, newsletter, segment, emails) {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Sending a test email has not been implemented yet. Turn off the email stability flag is you need this functionality.');
    }
}

module.exports = EmailService;
