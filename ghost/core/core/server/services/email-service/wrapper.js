const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;

class EmailServiceWrapper {
    init() {
        const {EmailService, EmailController, EmailRenderer, SendingService, BatchSendingService, EmailSegmenter} = require('@tryghost/email-service');
        const {Post, Newsletter, Email, EmailBatch, EmailRecipient, Member} = require('../../models');
        const settingsCache = require('../../../shared/settings-cache');
        const settingsHelpers = require('../../services/settings-helpers');
        const jobsService = require('../jobs');
        const membersService = require('../members');
        const db = require('../../data/db');
        const membersRepository = membersService.api.members;
        const limitService = require('../limits');

        const mobiledocLib = require('../../lib/mobiledoc');
        const lexicalLib = require('../../lib/lexical');
        const url = require('../../../server/api/endpoints/utils/serializers/output/utils/url');
        const urlUtils = require('../../../shared/url-utils');
        const memberAttribution = require('../member-attribution');
        const linkReplacer = require('@tryghost/link-replacer');
        const linkTracking = require('../link-tracking');
        const audienceFeedback = require('../audience-feedback');

        const emailRenderer = new EmailRenderer({
            settingsCache,
            settingsHelpers,
            renderers: {
                mobiledoc: mobiledocLib.mobiledocHtmlRenderer,
                lexical: lexicalLib.lexicalHtmlRenderer
            },
            imageSize: null,
            urlUtils,
            getPostUrl: (post) => {
                const jsonModel = post.toJSON();
                url.forPost(post.id, jsonModel, {options: {}});
                return jsonModel.url;
            },
            linkReplacer,
            linkTracking,
            memberAttributionService: memberAttribution.service,
            audienceFeedbackService: audienceFeedback.service
        });

        const sendingService = new SendingService({
            emailProvider: {
                send: async ({html, plaintext, subject, from, replyTo, recipients}) => {
                    const {GhostMailer} = require('../mail');
                    const mailer = new GhostMailer();
                    logging.info(`Sending email\nSubject: ${subject}\nFrom: ${from}\nReplyTo: ${replyTo}\nRecipients: ${recipients.length}\n\n${JSON.stringify(recipients[0].replacements, undefined, '    ')}`);
                    
                    for (const replacement of recipients[0].replacements) {
                        html = html.replace(replacement.token, replacement.value);
                        plaintext = plaintext.replace(replacement.token, replacement.value);
                    }

                    await mailer.send({
                        subject,
                        html,
                        to: recipients[0].email,
                        from,
                        replyTo,
                        text: plaintext
                    });
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
