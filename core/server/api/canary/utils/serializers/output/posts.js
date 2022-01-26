const debug = require('@tryghost/debug')('api:canary:utils:serializers:output:posts');
const mapper = require('./utils/mapper');

module.exports = {
    async all(models, apiConfig, frame) {
        debug('all');

        // CASE: e.g. destroy returns null
        if (!models) {
            return;
        }
        let posts = [];
        if (models.meta) {
            for (let model of models.data) {
                let post = await mapper.mapPost(model, frame);
                posts.push(post);
            }
            frame.response = {
                posts,
                meta: models.meta
            };

            return;
        }
        let post = await mapper.mapPost(models, frame);
        frame.response = {
            posts: [post]
        };
    }
};
