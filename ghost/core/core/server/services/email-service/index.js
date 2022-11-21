class EmailServiceWrapper {
    init() {
        const {EmailService, EmailController} = require('@tryghost/email-service');
        const {Post, Newsletter} = require('../../models');

        this.service = new EmailService({});
        this.controller = new EmailController(this.service, {
            models: {
                Post,
                Newsletter
            }
        });
    }
}

module.exports = new EmailServiceWrapper();
