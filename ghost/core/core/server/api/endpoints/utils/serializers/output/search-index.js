const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:explore');
const mappers = require('./mappers');

module.exports = {
    async fetchPosts(models, apiConfig, frame) {
        debug('search-index:fetchPosts');

        let posts = [];

        for (let model of models.data) {
            let post = await mappers.posts(model, frame, {});
            posts.push(post);
        }

        frame.response = {
            posts
        };
    }
};
