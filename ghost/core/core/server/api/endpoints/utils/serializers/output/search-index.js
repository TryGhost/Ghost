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
            'status',
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
    },

    async fetchPages(models, apiConfig, frame) {
        debug('fetchPages');

        let pages = [];

        const keys = [
            'id',
            'url',
            'title',
            'status',
            'published_at',
            'visibility'
        ];

        for (let model of models.data) {
            let page = await mappers.pages(model, frame, {});
            page = _.pick(page, keys);
            pages.push(page);
        }

        frame.response = {
            pages
        };
    },

    async fetchAuthors(models, apiConfig, frame) {
        debug('fetchAuthors');

        let authors = [];

        const keys = [
            'id',
            'slug',
            'name',
            'url',
            'profile_image'
        ];

        for (let model of models.data) {
            let author = await mappers.authors(model, frame);
            author = _.pick(author, keys);
            authors.push(author);
        }

        frame.response = {
            authors
        };
    },

    async fetchTags(models, apiConfig, frame) {
        debug('fetchTags');

        let tags = [];

        const keys = [
            'id',
            'slug',
            'name',
            'url'
        ];

        for (let model of models.data) {
            let tag = await mappers.tags(model, frame);
            tag = _.pick(tag, keys);
            tags.push(tag);
        }

        frame.response = {
            tags
        };
    }
};
