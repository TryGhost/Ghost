const mappers = require('./mappers');
const gating = require('./utils/post-gating');
const membersService = require('../../../../../services/members');

module.exports = {
    async read(model, apiConfig, frame) {
        const tiersModels = await membersService.api.productRepository.list({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });
        const tiers = tiersModels.data && tiersModels.data.map(tierModel => tierModel.toJSON());

        const emailPost = await mappers.posts(model, frame, {tiers});
        gating.forPost(emailPost, frame);

        frame.response = {
            email_posts: [emailPost]
        };
    }
};
