const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;

class EmailServiceWrapper {
    init() {
        const {EmailService, EmailController, EmailRenderer, SendingService, BatchSendingService, EmailSegmenter} = require('@tryghost/email-service');
        const {Post, Newsletter, Email, EmailBatch, EmailRecipient, Member} = require('../../models');
        const settingsCache = require('../../../shared/settings-cache');
        const jobsService = require('../jobs');
        const membersService = require('../members');
        const db = require('../../data/db');
        const membersRepository = membersService.api.members;
        const limitService = require('../limits');

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

        const emailSegmenter = new EmailSegmenter({
            membersRepository
        });
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
            emailRenderer,
            db
        });

        this.service = new EmailService({
            batchSendingService,
            models: {
                Email
            },
            settingsCache,
            emailRenderer,
            emailSegmenter,
            limitService
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

module.exports = EmailServiceWrapper;
