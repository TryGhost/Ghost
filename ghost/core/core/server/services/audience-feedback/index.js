const FeedbackRepository = require('./FeedbackRepository');

class AudienceFeedbackServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');

        const {AudienceFeedbackService, AudienceFeedbackController, Feedback} = require('@tryghost/audience-feedback');

        this.repository = new FeedbackRepository({
            Member: models.Member,
            MemberFeedback: models.MemberFeedback,
            Feedback,
            Post: models.Post
        });

        // Expose the service
        this.service = new AudienceFeedbackService();
        this.controller = new AudienceFeedbackController({repository: this.repository});
    }
}

module.exports = new AudienceFeedbackServiceWrapper();
