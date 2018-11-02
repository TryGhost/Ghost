const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:posts');
const url = require('./utils/url');
const date = require('./utils/date');
const utils = require('../../');

const mapPost = (model, frame) => {
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

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                posts: models.data.map(model => mapPost(model, frame)),
                meta: models.meta
            };

            debug(frame.response);
            return;
        }

        frame.response = {
            posts: [mapPost(models, frame)]
        };

        debug(frame.response);
    }
};
