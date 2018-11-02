const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:tags');
const url = require('./utils/url');
const date = require('./utils/date');
const utils = require('../../');

const mapTag = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forTag(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        ['created_at', 'updated_at'].forEach((field) => {
            if (jsonModel[field]) {
                jsonModel[field] = date.format(jsonModel[field]);
            }
        });
    }

    return jsonModel;
};

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                tags: models.data.map(model => mapTag(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            tags: [mapTag(models, frame)]
        };

        debug(frame.response);
    }
};
