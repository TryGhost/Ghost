const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:posts');
const mappers = require('./mappers');
const tiersService = require('../../../../../services/tiers');
const tiersSerializers = require('./tiers');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let posts = [];

        const tiersModels = await tiersService.api.browse({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });

        const tiers = tiersSerializers.browse(tiersModels, {
            docName: 'tiers',
            method: 'browse'
        }, {});

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
