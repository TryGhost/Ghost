const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;

class EmailServiceWrapper {
    init() {
        const {EmailService, EmailController, EmailRenderer, SendingService, BatchSendingService, EmailSegmenter} = require('@tryghost/email-service');
        const {Post, Newsletter, Email, EmailBatch, EmailRecipient, Member} = require('../../models');
        const settingsCache = require('../../../shared/settings-cache');
        const jobsService = require('../jobs');
        const db = require('../../data/db');

        const emailRenderer = new EmailRenderer();
        const sendingService = new SendingService({
            emailProvider: {
                send: ({plaintext, subject, from, replyTo, recipients}) => {
                    logging.info(`Sending email\nSubject: ${subject}\nFrom: ${from}\nReplyTo: ${replyTo}\nRecipients: ${recipients.length}\n\n${plaintext}`);
                    return Promise.resolve({id: 'fake_provider_id_' + ObjectID().toHexString()});
                }
            },
            emailRenderer
        });

        const emailSegmenter = new EmailSegmenter();
        const batchSendingService = new BatchSendingService({
            sendingService,
            models: {
                EmailBatch,
                EmailRecipient,
                Email,
                Member
            },
            jobsService,
            emailSegmenter,
            db
        });

        this.service = new EmailService({
            batchSendingService,
            models: {
                Email
            },
            settingsCache,
            emailRenderer
        });
        
        this.controller = new EmailController(this.service, {
            models: {
                Post,
                Newsletter,
                Email
            }
        });
    }
}

module.exports = new EmailServiceWrapper();
