const Promise = require('bluebird'),
    _ = require('lodash'),
    moment = require('moment'),
    pipeline = require('../../lib/promise/pipeline'),
    localUtils = require('./utils'),
    models = require('../../models'),
    config = require('../../config'),
    common = require('../../lib/common'),
    postsAPI = require('./posts');

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

    let post, publishedAtMoment,
        publishAPostBySchedulerToleranceInMinutes = config.get('times').publishAPostBySchedulerToleranceInMinutes;

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new common.errors.NoPermissionError({message: common.i18n.t('errors.permissions.noPermissionToAction')}));
    }

    options.context = {internal: true};

    return pipeline([
        localUtils.validate('posts', {opts: localUtils.idDefaultOptions}),
        (cleanOptions) => {
            cleanOptions.status = 'scheduled';

            return models.Base.transaction((transacting) => {
                cleanOptions.transacting = transacting;
                cleanOptions.forUpdate = true;

                // CASE: extend allowed options, see api/zip-folder.js
                cleanOptions.opts = ['forUpdate', 'transacting'];

                return postsAPI.read(cleanOptions)
                    .then((result) => {
                        post = result.posts[0];
                        publishedAtMoment = moment(post.published_at);

                        if (publishedAtMoment.diff(moment(), 'minutes') > publishAPostBySchedulerToleranceInMinutes) {
                            return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.job.notFound')}));
                        }

                        if (publishedAtMoment.diff(moment(), 'minutes') < publishAPostBySchedulerToleranceInMinutes * -1 && object.force !== true) {
                            return Promise.reject(new common.errors.NotFoundError({message: common.i18n.t('errors.api.job.publishInThePast')}));
                        }

                        return postsAPI.edit(
                            {
                                posts: [{status: 'published'}]
                            },
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
        localUtils.validate('posts', {opts: ['from', 'to']}),
        (cleanOptions) => {
            cleanOptions.filter = 'status:scheduled';
            cleanOptions.columns = ['id', 'published_at', 'created_at'];

            if (cleanOptions.from) {
                cleanOptions.filter += `+created_at:>='${moment(cleanOptions.from).format('YYYY-MM-DD HH:mm:ss')}'`;
            }

            if (cleanOptions.to) {
                cleanOptions.filter += `+created_at:<='${moment(cleanOptions.to).format('YYYY-MM-DD HH:mm:ss')}'`;
            }

            return models.Post.findAll(cleanOptions)
                .then((result) => {
                    return Promise.resolve({posts: result.models});
                });
        }
    ], options);
};
