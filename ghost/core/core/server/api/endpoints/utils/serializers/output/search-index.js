const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:search-index');
const mappers = require('./mappers');
const _ = require('lodash');

module.exports = {
    async fetchPosts(models, apiConfig, frame) {
        debug('fetchPosts');

        let posts = [];

        const keys = [
            'id',
            'slug',
            'title',
            'excerpt',
            'url',
            'created_at',
            'updated_at',
            'published_at',
            'visibility'
        ];

        for (let model of models.data) {
            let post = await mappers.posts(model, frame, {});
            post = _.pick(post, keys);
            posts.push(post);
        }

        frame.response = {
            posts
        };
    }
};
