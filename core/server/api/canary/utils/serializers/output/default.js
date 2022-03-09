const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:default');

module.exports = {
    all(models, apiConfig, frame) {
        debug('serializing', apiConfig.docName, apiConfig.method);

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                [apiConfig.docName]: models.data.map(model => model.toJSON(frame.options)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            [apiConfig.docName]: [models.toJSON(frame.options)]
        };
    }
};
