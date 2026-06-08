const urlUtils = require('../../../shared/url-utils');
const urlService = require('../../services/url');

const AudienceFeedbackService = require('./audience-feedback-service');
const AudienceFeedbackController = require('./audience-feedback-controller');
const Feedback = require('./feedback');
const FeedbackRepository = require('./feedback-repository');

class AudienceFeedbackServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');

        this.repository = new FeedbackRepository({
            Member: models.Member,
            MemberFeedback: models.MemberFeedback,
            Feedback,
            Post: models.Post
        });

        // Expose the service
        this.service = new AudienceFeedbackService({
            urlService,
            config: {
                baseURL: new URL(urlUtils.urlFor('home', true))
            }
        });
        this.controller = new AudienceFeedbackController({repository: this.repository});
    }
}

module.exports = new AudienceFeedbackServiceWrapper();
