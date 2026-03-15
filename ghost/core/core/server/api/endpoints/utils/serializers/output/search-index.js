const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:search-index');
const _ = require('lodash');

const mappers = require('./mappers');
const utils = require('../../index');

module.exports = {
    async fetchPosts(models, apiConfig, frame) {
        debug('fetchPosts');

        let posts = [];
        let keys = [];

        if (utils.isContentAPI(frame)) {
            keys.push(
                'id',
                'slug',
                'title',
                'excerpt',
                'url',
                'updated_at',
                'visibility'
            );
        } else {
            keys.push(
                'id',
                'uuid',
                'url',
                'title',
                'slug',
                'status',
                'published_at',
                'visibility'
            );
        }

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
            'uuid',
            'url',
            'title',
            'slug',
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

    async fetchUsers(models, apiConfig, frame) {
        debug('fetchUsers');

        let users = [];

        const keys = [
            'id',
            'slug',
            'name',
            'url',
            'profile_image'
        ];

        for (let model of models.data) {
            let user = await mappers.users(model, frame);
            user = _.pick(user, keys);
            users.push(user);
        }

        frame.response = {
            users
        };
    }
};
