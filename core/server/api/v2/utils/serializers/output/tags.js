const debug = require('ghost-ignition').debug('api:v2:utils:serializers:output:tags');
const urlService = require('../../../../../services/url');

const absoluteUrls = (tag) => {
    tag.url = urlService.getUrlByResourceId(tag.id, {absolute: true});

    if (tag.feature_image) {
        tag.feature_image = urlService.utils.urlFor('image', {image: tag.feature_image}, true);
    }

    return tag;
};

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                tags: models.data.map(model => absoluteUrls(model.toJSON(frame.options))),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            tags: [absoluteUrls(models.toJSON(frame.options))]
        };

        debug(frame.response);
    }
};
