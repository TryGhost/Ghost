const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:pages');
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
        let pages = [];

        const tiersModels = await tiersService.api.browse({
            withRelated: ['monthlyPrice', 'yearlyPrice']
        });

        const tiers = tiersSerializers.browse(tiersModels, {
            docName: 'tiers',
            method: 'browse'
        }, {});

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
