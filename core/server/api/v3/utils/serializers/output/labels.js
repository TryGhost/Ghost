const debug = require('ghost-ignition').debug('api:v3:utils:serializers:output:labels');
const mapper = require('./utils/mapper');

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                labels: models.data.map(model => mapper.mapLabel(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            labels: [mapper.mapLabel(models, frame)]
        };
    }
};
