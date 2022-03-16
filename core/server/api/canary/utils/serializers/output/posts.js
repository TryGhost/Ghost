const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:posts');
const mappers = require('./mappers');
const membersService = require('../../../../../services/members');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let posts = [];

        const tiersModels = await membersService.api.productRepository.list({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });
        const tiers = tiersModels.data ? tiersModels.data.map(tierModel => tierModel.toJSON()) : [];
        if (models.meta) {
            for (let model of models.data) {
                let post = await mappers.posts(model, frame, {tiers});
                posts.push(post);
            }
            frame.response = {
                posts,
                meta: models.meta
            };

            return;
        }
        let post = await mappers.posts(models, frame, {tiers});
        frame.response = {
            posts: [post]
        };
    }
};
