const AudienceFeedbackService = require('./audience-feedback-service');
const AudienceFeedbackController = require('./audience-feedback-controller');
const Feedback = require('./feedback');
const FeedbackRepository = require('./feedback-repository');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.urlUtils
 * @param {object} deps.urlService
 */
module.exports = function createAudienceFeedbackService({models, urlUtils, urlService}) {
    const repository = new FeedbackRepository({
        Member: models.Member,
        MemberFeedback: models.MemberFeedback,
        Feedback,
        Post: models.Post
    });

    const service = new AudienceFeedbackService({
        urlService,
        config: {
            baseURL: new URL(urlUtils.urlFor('home', true))
        }
    });

    const controller = new AudienceFeedbackController({
        repository,
        audienceFeedbackService: service
    });

    return {
        repository,
        service,
        controller,
        init() {}
    };
};
