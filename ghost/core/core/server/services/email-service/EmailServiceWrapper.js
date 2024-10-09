const logging = require('@tryghost/logging');
const url = require('../../api/endpoints/utils/serializers/output/utils/url');

class EmailServiceWrapper {
    getPostUrl(post) {
        const jsonModel = post.toJSON();
        url.forPost(post.id, jsonModel, {options: {}});
        return jsonModel.url;
    }

    init() {
        if (this.service) {
            return;
        }

        const {EmailService, EmailController, EmailRenderer, SendingService, BatchSendingService, EmailSegmenter, MailgunEmailProvider} = require('@tryghost/email-service');
        const {Post, Newsletter, Email, EmailBatch, EmailRecipient, Member} = require('../../models');
        const MailgunClient = require('@tryghost/mailgun-client');
        const configService = require('../../../shared/config');
        const settingsCache = require('../../../shared/settings-cache');
        const settingsHelpers = require('../settings-helpers');
        const jobsService = require('../jobs');
        const membersService = require('../members');
        const db = require('../../data/db');
        const sentry = require('../../../shared/sentry');
        const membersRepository = membersService.api.members;
        const limitService = require('../limits');
        const labs = require('../../../shared/labs');
        const emailAddressService = require('../email-address');

        const mobiledocLib = require('../../lib/mobiledoc');
        const lexicalLib = require('../../lib/lexical');
        const urlUtils = require('../../../shared/url-utils');
        const memberAttribution = require('../member-attribution');
        const linkReplacer = require('@tryghost/link-replacer');
        const linkTracking = require('../link-tracking');
        const audienceFeedback = require('../audience-feedback');
        const storageUtils = require('../../adapters/storage/utils');
        const emailAnalyticsJobs = require('../email-analytics/jobs');
        const {imageSize} = require('../../lib/image');

        // capture errors from mailgun client and log them in sentry
        const errorHandler = (error) => {
            logging.info(`Capturing error for mailgun email provider service`);
            sentry.captureException(error);
        };

        // Mailgun client instance for email provider
        const mailgunClient = new MailgunClient({
            config: configService, settings: settingsCache
        });

        const mailgunEmailProvider = new MailgunEmailProvider({
            mailgunClient,
            errorHandler
        });

        const emailRenderer = new EmailRenderer({
            settingsCache,
            settingsHelpers,
            renderers: {
                mobiledoc: mobiledocLib,
                lexical: lexicalLib
            },
            imageSize,
            urlUtils,
            storageUtils,
            getPostUrl: this.getPostUrl,
            linkReplacer,
            linkTracking,
            memberAttributionService: memberAttribution.service,
            audienceFeedbackService: audienceFeedback.service,
            outboundLinkTagger: memberAttribution.outboundLinkTagger,
            emailAddressService: emailAddressService.service,
            labs,
            models: {Post}
        });

        const sendingService = new SendingService({
            emailProvider: mailgunEmailProvider,
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
            db,
            sentry,
            debugStorageFilePath: configService.getContentPath('data')
        });

        this.renderer = emailRenderer;

        this.service = new EmailService({
            batchSendingService,
            sendingService,
            models: {
                Email
            },
            settingsCache,
            emailRenderer,
            emailSegmenter,
            limitService,
            membersRepository,
            verificationTrigger: membersService.verificationTrigger,
            emailAnalyticsJobs
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
