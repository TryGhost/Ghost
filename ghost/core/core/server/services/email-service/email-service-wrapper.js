const debug = require('@tryghost/debug')('i18n');
const logging = require('@tryghost/logging');
const url = require('../../api/endpoints/utils/serializers/output/utils/url');
const events = require('../../lib/common/events');

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

        const EmailService = require('./email-service');
        const EmailController = require('./email-controller');
        const EmailRenderer = require('./email-renderer');
        const SendingService = require('./sending-service');
        const BatchSendingService = require('./batch-sending-service');
        const EmailSegmenter = require('./email-segmenter');
        const {createBulkEmailProvider} = require('./bulk-email-provider-factory');
        const {DomainWarmingService} = require('./domain-warming-service');

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
        const {cachedImageSizeFromUrl} = require('../../lib/image');

        // Capture errors from the bulk email provider and log them in sentry
        const errorHandler = (error) => {
            logging.info(`Capturing error for bulk email provider service`);
            sentry.captureException(error);
        };

        const {emailProvider} = createBulkEmailProvider({
            config: configService,
            settings: settingsCache,
            errorHandler
        });

        const i18nLanguage = settingsCache.get('locale') || 'en';
        const i18n = i18nLib(i18nLanguage, 'ghost');

        events.on('settings.locale.edited', (model) => {
            debug('locale changed, updating i18n to', model.get('value'));
            i18n.changeLanguage(model.get('value'));
        });

        const emailRenderer = new EmailRenderer({
            settingsCache,
            settingsHelpers,
            renderers: {
                mobiledoc: mobiledocLib,
                lexical: lexicalLib
            },
            imageSize: cachedImageSizeFromUrl,
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
            t: i18n.t,
            dir: i18n.dir.bind(i18n)
        });

        const sendingService = new SendingService({
            emailProvider,
            emailRenderer,
            emailAddressService: emailAddressService.service
        });

        const emailSegmenter = new EmailSegmenter({
            membersRepository
        });

        const domainWarmingService = new DomainWarmingService({
            models: {Email},
            config: configService
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
            domainWarmingService,
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
            emailAnalyticsJobs,
            domainWarmingService,
            config: configService
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
