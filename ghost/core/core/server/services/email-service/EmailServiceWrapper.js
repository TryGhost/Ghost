const debug = require('@tryghost/debug')('i18n');
const logging = require('@tryghost/logging');
const url = require('../../api/endpoints/utils/serializers/output/utils/url');
const events = require('../../lib/common/events');
const MailgunClient = require('../lib/MailgunClient');
const PostmarkClient = require('@tryghost/postmark-client');

class EmailServiceWrapper {
    getPostUrl(post) {
        const jsonModel = post.toJSON();
        url.forPost(post.id, jsonModel, {options: {}});
        return jsonModel.url;
    }

    getMailClient(settingsCache, configService) {
        if (settingsCache.get('bulk_email_provider') === 'postmark') {
            // Postmark client instance for email provider
            return new PostmarkClient({
                config: configService, settings: settingsCache
            });
        }

        // Mailgun client instance for email provider
        return new MailgunClient({
            config: configService, settings: settingsCache
        });
    }

    init() {
        if (this.service) {
            return;
        }

        const EmailService = require('./EmailService');
        const EmailController = require('./EmailController');
        const EmailRenderer = require('./EmailRenderer');
        const SendingService = require('./SendingService');
        const BatchSendingService = require('./BatchSendingService');
        const EmailSegmenter = require('./EmailSegmenter');
        const BulkEmailProvider = require('./BulkEmailProvider');

        const {Post, Newsletter, Email, EmailBatch, EmailRecipient, Member} = require('../../models');
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
        const i18nLib = require('@tryghost/i18n');
        const mobiledocLib = require('../../lib/mobiledoc');
        const lexicalLib = require('../../lib/lexical');
        const urlUtils = require('../../../shared/url-utils');
        const memberAttribution = require('../member-attribution');
        const linkReplacer = require('../lib/link-replacer');
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

        // Mail client instance for email provider
        let mailClient = this.getMailClient(settingsCache, configService);

        const i18nLanguage = labs.isSet('i18n') ? settingsCache.get('locale') || 'en' : 'en';
        const i18n = i18nLib(i18nLanguage, 'ghost');

        events.on('settings.labs.edited', () => {
            if (labs.isSet('i18n')) {
                debug('labs i18n enabled, updating i18n to', settingsCache.get('locale'));
                i18n.changeLanguage(settingsCache.get('locale'));
            } else {
                debug('labs i18n disabled, updating i18n to en');
                i18n.changeLanguage('en');
            }
        });

        events.on('settings.locale.edited', (model) => {
            if (labs.isSet('i18n')) {
                debug('locale changed, updating i18n to', model.get('value'));
                i18n.changeLanguage(model.get('value'));
            }
        });

        const bulkEmailProvider = new BulkEmailProvider({
            mailClient,
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
            models: {Post},
            t: i18n.t
        });

        const sendingService = new SendingService({
            emailProvider: bulkEmailProvider,
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
