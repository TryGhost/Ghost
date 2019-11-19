const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:posts');
const mapper = require('./utils/mapper');
const moment = require('moment');
const postsCache = {};

module.exports = {
    all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }

        if (models.meta) {
            frame.response = {
                posts: models.data.map((model) => {
                    var key = model.id + '_' + JSON.stringify(frame);

                    if (!postsCache[key] || moment(new Date(postsCache[key].updated_at)).diff(new Date(model.updated_at)) < 0) {
                        postsCache[key] = mapper.mapPost(model, frame);
                    }

                    return postsCache[key];
                }),
                meta: models.meta
            };

            return;
        }

        frame.response = {
            posts: [mapper.mapPost(models, frame)]
        };
    }
};
