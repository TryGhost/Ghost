const {PostsService} = require('@tryghost/posts-service');

/**
 * @returns {InstanceType<PostsService>} instance of the PostsService
 */
const getPostServiceInstance = () => {
    const urlUtils = require('../../../shared/url-utils');
    const labs = require('../../../shared/labs');
    const models = require('../../models');
    const PostStats = require('./stats/post-stats');
    const emailService = require('../email-service');

    const postStats = new PostStats();

    return new PostsService({
        urlUtils: urlUtils,
        models: models,
        isSet: flag => labs.isSet(flag), // don't use bind, that breaks test subbing of labs
        stats: postStats,
        emailService: emailService.service
    });
};

module.exports = getPostServiceInstance;
// exposed for testing purposes only
module.exports.PostsService = PostsService;
