const PostsService = require('./posts-service');
const PostsExporter = require('./posts-exporter');
const url = require('../../../server/api/endpoints/utils/serializers/output/utils/url');
const {knex} = require('../../data/db');

/**
 * @returns {InstanceType<PostsService>} instance of the PostsService
 */
const getPostServiceInstance = () => {
    const urlUtils = require('../../../shared/url-utils');
    const labs = require('../../../shared/labs');
    const models = require('../../models');
    const PostStats = require('./stats/post-stats');
    const emailService = require('../email-service');
    const settingsCache = require('../../../shared/settings-cache');
    const settingsHelpers = require('../settings-helpers');

    const postStats = new PostStats();

    const postsExporter = new PostsExporter({
        models: {
            Post: models.Post,
            Newsletter: models.Newsletter,
            Label: models.Label,
            Product: models.Product
        },
        knex,
        getPostUrl(post) {
            // Support both Bookshelf models (export) and plain objects (exportStream)
            if (typeof post.toJSON === 'function') {
                const jsonModel = post.toJSON();
                url.forPost(post.id, jsonModel, {options: {}});
                return jsonModel.url;
            }
            // Plain row from Knex streaming
            const attrs = {...post};
            url.forPost(post.id, attrs, {options: {}});
            return attrs.url;
        },
        settingsCache,
        settingsHelpers
    });

    return new PostsService({
        urlUtils: urlUtils,
        models: models,
        isSet: flag => labs.isSet(flag), // don't use bind, that breaks test subbing of labs
        stats: postStats,
        emailService: emailService.service,
        postsExporter
    });
};

module.exports = getPostServiceInstance;
// exposed for testing purposes only
module.exports.PostsService = PostsService;
