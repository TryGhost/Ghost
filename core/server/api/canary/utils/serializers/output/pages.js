const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:pages');
const mappers = require('./mappers');
const membersService = require('../../../../../services/members');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let pages = [];

        const tiersModels = await membersService.api.productRepository.list({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });
        const tiers = tiersModels.data ? tiersModels.data.map(tierModel => tierModel.toJSON()) : [];

        if (models.meta) {
            for (let model of models.data) {
                let page = await mappers.pages(model, frame, {tiers});
                pages.push(page);
            }
            frame.response = {
                pages,
                meta: models.meta
            };

            return;
        }
        let page = await mappers.pages(models, frame, {tiers});
        frame.response = {
            pages: [page]
        };
    }
};
