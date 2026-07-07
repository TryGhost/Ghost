const debug = require('@tryghost/debug')('i18n');
const logging = require('@tryghost/logging');
const url = require('../../api/endpoints/utils/serializers/output/utils/url');

class EmailServiceWrapper {
    #deps;

    /**
     * @param {object} deps - the scope's services and config views; see init() usage
     */
    constructor(deps) {
        this.#deps = deps;
    }

    getPostUrl(post) {
        const jsonModel = post.toJSON();
        url.forPost(post.id, jsonModel, {options: {}});
        return jsonModel.url;
    }

    init({ghostServer} = {}) {
        if (this.service) {
            return;
        }

        const EmailService = require('./email-service');
        const EmailController = require('./email-controller');
        const EmailRenderer = require('./email-renderer');
        const SendingService = require('./sending-service');
        const BatchSendingService = require('./batch-sending-service');
        const EmailSegmenter = require('./email-segmenter');
        const MailgunEmailProvider = require('./mailgun-email-provider');
        const {DomainWarmingService} = require('./domain-warming-service');
        const MailgunClient = require('../lib/mailgun-client');
        const i18nLib = require('@tryghost/i18n');
        const lexicalLib = require('../../lib/lexical');
        const linkReplacer = require('../lib/link-replacer');
        const storageUtils = require('../../adapters/storage/utils');
        const emailAnalyticsJobs = require('../email-analytics/jobs');
        const {cachedImageSizeFromUrl} = require('../../lib/image');
        const sentry = require('../../../shared/sentry');

        const {
            models, events, settingsCache, settingsHelpers, urlUtils, limits: limitService,
            emailAddress: emailAddressService, memberAttribution, linkTracking, audienceFeedback,
            knex, urlService, jobsService, membersService, labs, deploymentConfig: configService,
            siteConfig
        } = this.#deps;
        const {Post, Newsletter, Email, EmailBatch, EmailRecipient, Member} = models;
        const getRequiredUrlRelations = () => urlService.facade.getRequiredRelations();
        const db = {knex};
        const membersRepository = membersService.api.members;

        // capture errors from mailgun client and log them in sentry
        const errorHandler = (error) => {
            logging.info(`Capturing error for mailgun email provider service`);
            sentry.captureException(error);
        };

        // Mailgun client instance for email provider
        const mailgunClient = new MailgunClient({
            config: configService, settings: settingsCache, labs
        });
        const i18nLanguage = settingsCache.get('locale') || 'en';
        const i18n = i18nLib(i18nLanguage, 'ghost');

        events.on('settings.locale.edited', (model) => {
            debug('locale changed, updating i18n to', model.get('value'));
            i18n.changeLanguage(model.get('value'));
        });

        const mailgunEmailProvider = new MailgunEmailProvider({
            mailgunClient,
            errorHandler
        });

        const emailRenderer = new EmailRenderer({
            settingsCache,
            settingsHelpers,
            renderers: {
                lexical: lexicalLib
            },
            imageSize: cachedImageSizeFromUrl,
            urlUtils,
            storageUtils,
            getPostUrl: this.getPostUrl,
            getRequiredUrlRelations,
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
            emailProvider: mailgunEmailProvider,
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
            getRequiredUrlRelations,
            debugStorageFilePath: siteConfig.dataContentPath
        });

        if (ghostServer) {
            ghostServer.registerCleanupTask(() => batchSendingService.onShutdown());
        }

        this.renderer = emailRenderer;

        this.service = new EmailService({
            batchSendingService,
            sendingService,
            models: {
                Email,
                EmailBatch
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
            },
            getRequiredUrlRelations
        });
    }
}

module.exports = EmailServiceWrapper;
