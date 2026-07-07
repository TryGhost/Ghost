const logging = require('@tryghost/logging');
const sentry = require('../../../shared/sentry');
const externalRequest = require('../../lib/request-external.js');
const MentionCreatedEvent = require('../mentions/mention-created-event');
const RecommendationEnablerService = require('./recommendation-enabler-service');
const {GhostMailer} = require('../mail');

const {
    BookshelfRecommendationRepository,
    RecommendationService,
    RecommendationController,
    WellknownService,
    BookshelfClickEventRepository,
    IncomingRecommendationController,
    IncomingRecommendationService,
    IncomingRecommendationEmailRenderer,
    RecommendationMetadataService
} = require('./service');

const PATH_SUFFIX = '/.well-known/recommendations.json';

function isRecommendationUrl(url) {
    return url.pathname.endsWith(PATH_SUFFIX);
}

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.domainEvents
 * @param {object} deps.urlUtils
 * @param {object} deps.siteConfig
 * @param {{get: (key: string) => unknown}} deps.deploymentConfig
 * @param {object} deps.mentions
 * @param {object} deps.staff
 * @param {object} deps.settingsBREADService
 * @param {object} deps.oembedService
 */
module.exports = function createRecommendationsService({models, domainEvents, urlUtils, siteConfig, deploymentConfig, mentions, staff, settingsBREADService, oembedService}) {
    if (deploymentConfig.get('services:recommendations:enabled') === false) {
        logging.info('[Recommendations] Service is disabled via config');
        return {init() {}};
    }

    const wellknownService = new WellknownService({
        dir: siteConfig.publicContentPath,
        urlUtils
    });

    const recommendationEnablerService = new RecommendationEnablerService({settingsService: settingsBREADService});

    const repository = new BookshelfRecommendationRepository(models.Recommendation, {sentry});
    const clickEventRepository = new BookshelfClickEventRepository(models.RecommendationClickEvent, {sentry});
    const subscribeEventRepository = new BookshelfClickEventRepository(models.RecommendationSubscribeEvent, {sentry});

    const recommendationMetadataService = new RecommendationMetadataService({
        oembedService,
        externalRequest
    });

    const service = new RecommendationService({
        repository,
        recommendationEnablerService,
        wellknownService,
        mentionSendingService: mentions.sendingService,
        clickEventRepository,
        subscribeEventRepository,
        recommendationMetadataService
    });

    const mailer = new GhostMailer();
    const emailService = {
        async send(to, subject, html, text) {
            return mailer.send({
                to,
                subject,
                html,
                text
            });
        }
    };

    const incomingRecommendationService = new IncomingRecommendationService({
        mentionsApi: mentions.api,
        recommendationService: service,
        emailService,
        async getEmailRecipients() {
            const users = await models.User.getEmailAlertUsers('recommendation-received');
            return users.map((model) => {
                return {
                    email: model.email,
                    slug: model.slug
                };
            });
        },
        emailRenderer: new IncomingRecommendationEmailRenderer({
            staffService: staff
        })
    });

    const controller = new RecommendationController({service});
    const incomingRecommendationController = new IncomingRecommendationController({service: incomingRecommendationService});

    let initialized = false;

    return {
        repository,
        clickEventRepository,
        subscribeEventRepository,
        controller,
        service,
        incomingRecommendationService,
        incomingRecommendationController,
        init() {
            if (initialized) {
                return;
            }
            initialized = true;

            service.init().catch(logging.error);
            incomingRecommendationService.init().catch(logging.error);

            mentions.metadata.addMapper((url) => {
                if (isRecommendationUrl(url)) {
                    const newUrl = new URL(url.toString());
                    newUrl.pathname = newUrl.pathname.slice(0, -PATH_SUFFIX.length);
                    return newUrl;
                }
            });

            domainEvents.subscribe(MentionCreatedEvent, async (event) => {
                if (event.data.mention.verified && isRecommendationUrl(event.data.mention.source)) {
                    logging.info('[INCOMING RECOMMENDATION] Received recommendation from ' + event.data.mention.source);
                    await incomingRecommendationService.sendRecommendationEmail(event.data.mention);
                }
            });
        }
    };
};
