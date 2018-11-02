const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:pages');
const url = require('./utils/url');
const date = require('./utils/date');
const utils = require('../../');

const mapPage = (model, frame) => {
    const jsonModel = model.toJSON(frame.options);
    url.forPost(model.id, jsonModel, frame.options);

    if (utils.isContentAPI(frame)) {
        ['created_at', 'updated_at', 'published_at'].forEach((field) => {
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

        if (models.meta) {
            frame.response = {
                pages: models.data.map(model => mapPage(model, frame)),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            pages: [mapPage(models, frame)]
        };

        debug(frame.response);
    }
};
