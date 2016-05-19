var _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),
    pipeline = require('../utils/pipeline'),
    dataProvider = require('../models'),
    config = require('../config'),
    errors = require('../errors'),
    utils = require('./utils');

/**
 * publish a scheduled post
 */
exports.publishPost = function publishPost(options) {
    options = options || {};

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError());
    }

    return pipeline([
        utils.validate('posts', {opts: utils.idDefaultOptions}),
        function (cleanOptions) {
            return dataProvider.Post.edit({status: 'published'}, _.omit(cleanOptions, 'data'))
                .then(function (result) {
                    return Promise.resolve({post: result.toJSON(cleanOptions)});
                });
        }
    ], options);
};

/**
 * get all scheduled posts/pages
 * permission check not needed, because route is not exposed
 *
 * @TODO: wait that GQL supports dates for all databases
 */
exports.getScheduledPosts = function readPosts(options) {
    options = options || {};
    options.context = {internal: true};

    return pipeline([
        utils.validate('posts', {opts: ['from', 'to']}),
        function (cleanOptions) {
            cleanOptions.filter = 'status:scheduled';
            cleanOptions.columns = ['id', 'published_at', 'created_at'];

            if (cleanOptions.from) {
                if (['mysql', 'pg'].indexOf(config.database.client) !== -1) {
                    cleanOptions.filter += '+created_at:>=\'' + moment(cleanOptions.from).format('YYYY-MM-DD HH:mm:ss') + '\'';
                } else {
                    cleanOptions.filter += '+created_at:>=' + moment(cleanOptions.from).valueOf();
                }
            }

            if (cleanOptions.to) {
                if (['mysql', 'pg'].indexOf(config.database.client) !== -1) {
                    cleanOptions.filter += '+created_at:<=\'' + moment(cleanOptions.to).format('YYYY-MM-DD HH:mm:ss') + '\'';
                } else {
                    cleanOptions.filter += '+created_at:<=' + moment(cleanOptions.to).valueOf();
                }
            }

            return dataProvider.Post.findAll(cleanOptions)
                .then(function (result) {
                    return Promise.resolve({posts: result.models});
                });
        }
    ], options);
};
