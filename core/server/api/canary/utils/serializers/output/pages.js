const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:pages');
const mapper = require('./utils/mapper');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let pages = [];
        if (models.meta) {
            for (let model of models.data) {
                let page = await mapper.mapPage(model, frame);
                pages.push(page);
            }
            frame.response = {
                pages,
                meta: models.meta
            };

            return;
        }
        let page = await mapper.mapPage(models, frame);
        frame.response = {
            pages: [page]
        };
    }
};
