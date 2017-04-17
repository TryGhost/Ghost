var _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require('../config'),
    pipeline = require(config.paths.corePath + '/server/utils/pipeline'),
    dataProvider = require(config.paths.corePath + '/server/models'),
    i18n = require(config.paths.corePath + '/server/i18n'),
    errors = require(config.paths.corePath + '/server/errors'),
    apiPosts = require(config.paths.corePath + '/server/api/posts'),
    utils = require('./utils');

/**
 * Publish a scheduled post
 *
 * `apiPosts.read` and `apiPosts.edit` must happen in one transaction.
 * We lock the target row on fetch by using the `forUpdate` option.
 * Read more in models/post.js - `onFetching`
 *
 * object.force: you can force publishing a post in the past (for example if your service was down)
 */
exports.publishPost = function publishPost(object, options) {
    if (_.isEmpty(options)) {
        options = object || {};
        object = {};
    }

    var post, publishedAtMoment,
        publishAPostBySchedulerToleranceInMinutes = config.times.publishAPostBySchedulerToleranceInMinutes;

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    options.context = {internal: true};

    return pipeline([
        utils.validate('posts', {opts: utils.idDefaultOptions}),
        function (cleanOptions) {
            cleanOptions.status = 'scheduled';

            return dataProvider.Base.transaction(function (transacting) {
                cleanOptions.transacting = transacting;
                cleanOptions.forUpdate = true;

                // CASE: extend allowed options, see api/utils.js
                cleanOptions.opts = ['forUpdate', 'transacting'];

                return apiPosts.read(cleanOptions)
                    .then(function (result) {
                        post = result.posts[0];
                        publishedAtMoment = moment(post.published_at);

                        if (publishedAtMoment.diff(moment(), 'minutes') > publishAPostBySchedulerToleranceInMinutes) {
                            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.notFound')));
                        }

                        if (publishedAtMoment.diff(moment(), 'minutes') < publishAPostBySchedulerToleranceInMinutes * -1 && object.force !== true) {
                            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.publishInThePast')));
                        }

                        return apiPosts.edit({
                            posts: [{status: 'published'}]},
                            _.pick(cleanOptions, ['context', 'id', 'transacting', 'forUpdate', 'opts'])
                        );
                    });
            });
        }
    ], options);
};

/**
 * get all scheduled posts/pages
 * permission check not needed, because route is not exposed
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
                cleanOptions.filter += '+created_at:>=\'' + moment(cleanOptions.from).format('YYYY-MM-DD HH:mm:ss') + '\'';
            }

            if (cleanOptions.to) {
                cleanOptions.filter += '+created_at:<=\'' + moment(cleanOptions.to).format('YYYY-MM-DD HH:mm:ss') + '\'';
            }

            return dataProvider.Post.findAll(cleanOptions)
                .then(function (result) {
                    return Promise.resolve({posts: result.models});
                });
        }
    ], options);
};
