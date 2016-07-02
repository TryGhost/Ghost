var _ = require('lodash'),
    Promise = require('bluebird'),
    moment = require('moment'),
    config = require('../config'),
    pipeline = require(config.paths.corePath + '/server/utils/pipeline'),
    dataProvider = require(config.paths.corePath + '/server/models'),
    i18n = require(config.paths.corePath + '/server/i18n'),
    errors = require(config.paths.corePath + '/server/errors'),
    serverUtils = require(config.paths.corePath + '/server/utils'),
    apiPosts = require(config.paths.corePath + '/server/api/posts'),
    mail = require(config.paths.corePath + '/server/mail'),
    apiUtils = require('./utils');

/**
 * publish a scheduled post
 *
 * object.force: you can force publishing a post in the past (for example if your service was down)
 */
exports.publishPost = function publishPost(object, options) {
    if (_.isEmpty(options)) {
        options = object || {};
        object = {};
    }

    var post, publishedAtMoment,
        schedulerToleranceInMinutes = config.times.schedulerToleranceInMinutes;

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    options.context = {internal: true};

    return pipeline([
        apiUtils.validate('posts', {opts: apiUtils.idDefaultOptions}),
        function (cleanOptions) {
            cleanOptions.status = 'scheduled';

            return apiPosts.read(cleanOptions)
                .then(function (result) {
                    post = result.posts[0];
                    publishedAtMoment = moment(post.published_at);

                    if (publishedAtMoment.diff(moment(), 'minutes') > schedulerToleranceInMinutes) {
                        return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.notFound')));
                    }

                    if (publishedAtMoment.diff(moment(), 'minutes') < schedulerToleranceInMinutes * -1 && object.force !== true) {
                        return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.jobInThePast')));
                    }

                    return apiPosts.edit({posts: [{status: 'published'}]}, _.pick(cleanOptions, ['context', 'id']));
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
        apiUtils.validate('posts', {opts: ['from', 'to']}),
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

/**
 * @TODO:
 * - mail config!mailgun config!
 */
exports.sendNewsletter = function sendNewsletter(object, options) {
    if (_.isEmpty(options)) {
        options = object || {};
        object = {};
    }

    var fromMoment = config.newsletter.lastExecutedAt ? moment(config.newsletter.lastExecutedAt) : moment().subtract(30, 'days'),
        toMoment = moment(),
        schedulerToleranceInMinutes = config.times.schedulerToleranceInMinutes,
        mailgun = new mail.GhostMailgun({
            apiKey: config.mail.options.auth.apiKey,
            domain: config.mail.options.auth.domain
        }), posts, subscribers;

    // CASE: only the scheduler client is allowed to publish (hardcoded because of missing client permission system)
    if (!options.context || !options.context.client || options.context.client !== 'ghost-scheduler') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    // CASE: newsletter was disabled, but job was even though triggered
    if (config.newsletter.status === 'disabled') {
        return Promise.reject(new errors.NoPermissionError(i18n.t('errors.permissions.noPermissionToAction')));
    }

    // CASE: double check that newsletter should get send now
    try {
        var nextExecutionDate = serverUtils.rrule.getNextDate({
            rruleString: config.newsletter.rrule,
            date: config.newsletter.lastExecutedAt
        });

        if (moment(nextExecutionDate).diff(moment(), 'minutes') > schedulerToleranceInMinutes) {
            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.notFound')));
        }

        if (moment(nextExecutionDate).diff(moment(), 'minutes') < schedulerToleranceInMinutes * -1 && object.force !== true) {
            return Promise.reject(new errors.NotFoundError(i18n.t('errors.api.job.jobInThePast')));
        }
    } catch (err) {
        return Promise.reject(err);
    }

    options.context = {internal: true};

    // @TODO: yes/no?
    options.limit = 5;
    options.filter = 'status:published';
    options.filter = 'created_at:>=\'' + fromMoment.format('YYYY-MM-DD HH:mm:ss') + '\'';
    options.filter += '+created_at:<=\'' + toMoment.format('YYYY-MM-DD HH:mm:ss') + '\'';

    return dataProvider.Post.findAll(options)
        .then(function (result) {
            if (!result || !result.length) {
                return Promise.resolve();
            }

            posts = result.toJSON();
            return dataProvider.Subscriber.findAll({filter: 'status:subscribed'});
        }).then(function (result) {
            if (!result || !result.length) {
                return Promise.resolve();
            }

            subscribers = result.toJSON();

            return mail.utils.generateContent({
                template: 'newsletter',
                data: {
                    blog: {
                        title: config.theme.title,
                        logo: config.theme.logo,
                        url: config.getBaseUrl(),
                        // @TODO: replace me
                        unsubscribe: 'http://ghost.org/unsubscribe',
                        post: posts
                    },
                    newsletter: {
                        interval: config.newsletter.rrule.match(/FREQ=(\w+);/)[1],
                        date: moment().format('MMMM Do YYYY')
                    }
                }
            });
        })
        .then(function (result) {
            if (!result) {
                return Promise.resolve();
            }

            return new Promise(function (resolve, reject) {
                mailgun.send({
                    title: 'Newsletter',
                    from: config.newsletterFromAddress || config.mail.from,
                    to: subscribers,
                    text: result.text,
                    html: result.html
                }, function (err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            });
        })
        .finally(function () {
            // we always update the settings entry, even if it was not successful, to ensure newsletter gets rescheduled
            config.newsletter.lastExecutedAt = toMoment.valueOf();
            dataProvider.Settings.edit({
                key: 'newsletter',
                value: JSON.stringify(config.newsletter)
            }, options).catch(function (err) {
                errors.logError(err, 'schedules: error on settings update');
            });
        })
};
