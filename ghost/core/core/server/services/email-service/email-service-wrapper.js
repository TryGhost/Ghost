const debug = require('@tryghost/debug')('i18n');
const logging = require('@tryghost/logging');
const url = require('../../api/endpoints/utils/serializers/output/utils/url');
const events = require('../../lib/common/events');

class EmailServiceWrapper {
  getPostUrl(post) {
    const jsonModel = post.toJSON();
    // The URL service routes by resource type. Pages and posts share the
    // Post model, so the page's own type must reach forPost — otherwise it
    // defaults to 'posts', matches no post collection, and 404s under the
    // lazy service.
    const type = jsonModel.type === 'page' ? 'pages' : 'posts';
    url.forPost(post.id, jsonModel, { options: {} }, type);
    return jsonModel.url;
  }

  init({ ghostServer } = {}) {
    if (this.service) {
      return;
    }

    const EmailService = require('./email-service');
    const EmailController = require('./email-controller');
    const EmailRenderer = require('./email-renderer');
    const SendingService = require('./sending-service');
    const BatchSendingService = require('./batch-sending-service');
    const EmailSegmenter = require('./email-segmenter');
    const { DomainWarmingService } = require('./domain-warming-service');

    const { Post, Newsletter, Email, EmailBatch, EmailRecipient, Member } = require('../../models');
    const urlService = require('../url');
    const getRequiredUrlRelations = () => urlService.getRequiredRelations();
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
    const lexicalLib = require('../../lib/lexical');
    const urlUtils = require('../../../shared/url-utils').default;
    const memberAttribution = require('../member-attribution');
    const linkReplacer = require('../lib/link-replacer');
    const linkTracking = require('../link-tracking');
    const audienceFeedback = require('../audience-feedback');
    const storageUtils = require('../../adapters/storage/utils');
    const emailAnalyticsJobs = require('../email-analytics/jobs');
    const { cachedImageSizeFromUrl } = require('../../lib/image');

    // Determine which email provider to use based on adapter configuration
    const emailAdapterConfig = configService.get('adapters:email');
    const emailProvider = emailAdapterConfig?.active?.toLowerCase() || 'mailgun';

    // capture errors from email provider and log them in sentry
    const errorHandler = (error) => {
      logging.info(`Capturing error for ${emailProvider} email provider service`);
      sentry.captureException(error);
    };
    const i18nLanguage = settingsCache.get('locale') || 'en';
    const i18n = i18nLib(i18nLanguage, 'ghost');

    events.on('settings.locale.edited', (model) => {
      debug('locale changed, updating i18n to', model.get('value'));
      i18n.changeLanguage(model.get('value'));
    });

    let emailProviderInstance;

    // Use adapter pattern for all email providers
    logging.info(`Initializing ${emailProvider} email provider via adapter`);

    const emailAdapter = require('../../adapters/email');

    // Get adapter instance with injected dependencies
    emailProviderInstance = emailAdapter.getEmailAdapter();

    // Inject dependencies needed by the adapter
    const AdapterClass = emailProviderInstance.constructor;
    const adapterConfig = {
      configService,
      settingsCache,
      errorHandler,
      labs,
    };

    // Merge with provider-specific config from adapters.email[provider]
    if (emailAdapterConfig?.[emailProvider]) {
      Object.assign(adapterConfig, emailAdapterConfig[emailProvider]);
    }

    emailProviderInstance = new AdapterClass(adapterConfig);

    const emailRenderer = new EmailRenderer({
      settingsCache,
      settingsHelpers,
      renderers: {
        lexical: lexicalLib,
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
      models: { Post },
      t: i18n.t,
      dir: i18n.dir.bind(i18n),
    });

    const sendingService = new SendingService({
      emailProvider: emailProviderInstance,
      emailRenderer,
      emailAddressService: emailAddressService.service,
    });

    const emailSegmenter = new EmailSegmenter({
      membersRepository,
    });

    const domainWarmingService = new DomainWarmingService({
      models: { Email },
      config: configService,
    });

    const batchSendingService = new BatchSendingService({
      sendingService,
      models: {
        EmailBatch,
        EmailRecipient,
        Email,
        Member,
      },
      jobsService,
      emailSegmenter,
      emailRenderer,
      domainWarmingService,
      db,
      sentry,
      getRequiredUrlRelations,
      debugStorageFilePath: configService.getContentPath('data'),
    });

    if (ghostServer) {
      // Two phases: stop claiming batches immediately, drain in-flight ones later.
      // Draining alone would leave workers claiming new batches for the whole HTTP
      // server drain, each a fresh orphan candidate.
      ghostServer.registerPreStopTask(
        () => batchSendingService.onPreStop(),
        'Email batch sending (stop claiming)',
      );
      ghostServer.registerCleanupTask(
        () => batchSendingService.onShutdown(),
        'Email batch sending',
      );
    }

    this.renderer = emailRenderer;

    this.service = new EmailService({
      batchSendingService,
      sendingService,
      models: {
        Email,
        EmailBatch,
      },
      settingsCache,
      emailRenderer,
      emailSegmenter,
      limitService,
      membersRepository,
      verificationTrigger: membersService.verificationTrigger,
      emailAnalyticsJobs,
      domainWarmingService,
      config: configService,
    });

    this.controller = new EmailController(this.service, {
      models: {
        Post,
        Newsletter,
        Email,
      },
      getRequiredUrlRelations,
    });
  }
}

module.exports = EmailServiceWrapper;
