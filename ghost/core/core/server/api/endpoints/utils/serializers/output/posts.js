const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:posts');
const mappers = require('./mappers');
const membersService = require('../../../../../services/members');
const papaparse = require('papaparse');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let posts = [];

        const tiersModels = await membersService.api?.productRepository.list({
            limit: 'all'
        });
        const tiers = tiersModels?.data ? tiersModels.data.map(tierModel => tierModel.toJSON()) : [];
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
    },

    exportCSV(models, apiConfig, frame) {
        frame.response = papaparse.unparse(models.data);
    },

    bulkEdit(bulkActionResult, _apiConfig, frame) {
        frame.response = {
            bulk: {
                action: frame.data.action,
                meta: {
                    stats: {
                        successful: bulkActionResult.successful,
                        unsuccessful: bulkActionResult.unsuccessful
                    },
                    errors: bulkActionResult.errors,
                    unsuccessfulData: bulkActionResult.unsuccessfulData
                }
            }
        };
    },

    bulkDestroy(bulkActionResult, _apiConfig, frame) {
        frame.response = bulkActionResult;
    }
};
