/**
 * Update Checking Unit
 *
 * Makes a request to Ghost.org to request release & custom notifications.
 * The service is provided in return for users opting in to anonymous usage data collection.
 *
 * Blog owners can opt-out of update checks by setting `privacy: { useUpdateCheck: false }` in their config file.
 */

const crypto = require('crypto'),
    exec = require('child_process').exec,
    moment = require('moment'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    url = require('url'),
    debug = require('ghost-ignition').debug('update-check'),
    api = require('./api').v2,
    config = require('./config'),
    urlUtils = require('./lib/url-utils'),
    common = require('./lib/common'),
    request = require('./lib/request'),
    ghostVersion = require('./lib/ghost-version'),
    internal = {context: {internal: true}},
    allowedCheckEnvironments = ['development', 'production'];

function nextCheckTimestamp() {
    var now = Math.round(new Date().getTime() / 1000);
    return now + (24 * 3600);
}

/**
 * @description Centralised error handler for the update check unit.
 *
 * CASES:
 *   - the update check service returns an error
 *   - error during collecting blog stats
 *
 * We still need to ensure that we set the "next_update_check" to a new value, otherwise no more
 * update checks will happen.
 *
 * @param err
 */
function updateCheckError(err) {
    api.settings.edit({
        settings: [{
            key: 'next_update_check',
            value: nextCheckTimestamp()
        }]
    }, internal);

    err.context = common.i18n.t('errors.updateCheck.checkingForUpdatesFailed.error');
    err.help = common.i18n.t('errors.updateCheck.checkingForUpdatesFailed.help', {url: 'https://ghost.org/docs/'});
    common.logging.error(err);
}

/**
 * @description Create a Ghost notification and call the API controller.
 *
 * @param {Object} notification
 * @return {Promise}
 */
function createCustomNotification(notification) {
    if (!notification) {
        return Promise.resolve();
    }

    return Promise.each(notification.messages, function (message) {
        let toAdd = {
            // @NOTE: the update check service returns "0" or "1" (https://github.com/TryGhost/UpdateCheck/issues/43)
            custom: !!notification.custom,
            createdAt: moment(notification.created_at).toDate(),
            status: message.status || 'alert',
            type: message.type || 'info',
            id: message.id,
            dismissible: Object.prototype.hasOwnProperty.call(message, 'dismissible') ? message.dismissible : true,
            top: !!message.top,
            message: message.content
        };

        debug('Add Custom Notification', toAdd);
        return api.notifications.add({notifications: [toAdd]}, {context: {internal: true}});
    });
}

/**
 * @description Collect stats from your blog.
 * @returns {Promise}
 */
function updateCheckData() {
    let data = {},
        mailConfig = config.get('mail');

    data.ghost_version = ghostVersion.original;
    data.node_version = process.versions.node;
    data.env = config.get('env');
    data.database_type = config.get('database').client;
    data.email_transport = mailConfig &&
        (mailConfig.options && mailConfig.options.service ?
            mailConfig.options.service :
            mailConfig.transport);

    return Promise.props({
        hash: api.settings.read(_.extend({key: 'db_hash'}, internal)).reflect(),
        theme: api.settings.read(_.extend({key: 'active_theme'}, internal)).reflect(),
        posts: api.posts.browse().reflect(),
        users: api.users.browse(internal).reflect(),
        npm: Promise.promisify(exec)('npm -v').reflect()
    }).then(function (descriptors) {
        var hash = descriptors.hash.value().settings[0],
            theme = descriptors.theme.value().settings[0],
            posts = descriptors.posts.value(),
            users = descriptors.users.value(),
            npm = descriptors.npm.value(),
            blogUrl = url.parse(urlUtils.urlFor('home', true)),
            blogId = blogUrl.hostname + blogUrl.pathname.replace(/\//, '') + hash.value;

        data.blog_id = crypto.createHash('md5').update(blogId).digest('hex');
        data.theme = theme ? theme.value : '';
        data.post_count = posts && posts.meta && posts.meta.pagination ? posts.meta.pagination.total : 0;
        data.user_count = users && users.users && users.users.length ? users.users.length : 0;
        data.blog_created_at = users && users.users && users.users[0] && users.users[0].created_at ? moment(users.users[0].created_at).unix() : '';
        data.npm_version = npm.trim();

        return data;
    }).catch(updateCheckError);
}

/**
 * @description Perform request to update check service.
 *
 * With the privacy setting `useUpdateCheck` you can control if you want to expose data/stats from your blog to the
 * service. Enabled or disabled, you will receive the latest notification available from the service.
 *
 * @see https://ghost.org/docs/concepts/config/#privacy
 * @returns {Promise}
 */
function updateCheckRequest() {
    return updateCheckData()
        .then(function then(reqData) {
            let reqObj = {
                    timeout: 1000,
                    headers: {}
                },
                checkEndpoint = config.get('updateCheck:url'),
                checkMethod = config.isPrivacyDisabled('useUpdateCheck') ? 'GET' : 'POST';

            // CASE: Expose stats and do a check-in
            if (checkMethod === 'POST') {
                reqObj.json = true;
                reqObj.body = reqData;
                reqObj.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(reqData));
                reqObj.headers['Content-Type'] = 'application/json';
            } else {
                reqObj.json = true;
                reqObj.query = {
                    ghost_version: reqData.ghost_version
                };
            }

            debug('Request Update Check Service', checkEndpoint);

            return request(checkEndpoint, reqObj)
                .then(function (response) {
                    return response.body;
                })
                .catch(function (err) {
                    // CASE: no notifications available, ignore
                    if (err.statusCode === 404) {
                        return {
                            next_check: nextCheckTimestamp(),
                            notifications: []
                        };
                    }

                    // CASE: service returns JSON error, deserialize into JS error
                    if (err.response && err.response.body && typeof err.response.body === 'object') {
                        err = common.errors.utils.deserialize(err.response.body);
                    }

                    throw err;
                });
        });
}

/**
 * @description This function handles the response from the update check service.
 *
 * The helper does three things:
 *
 * 1. Updates the time in the settings table to know when we can execute the next update check request.
 * 2. Iterates over the received notifications and filters them out based on your notification groups.
 * 3. Calls a custom helper to generate a Ghost notification for the database.
 *
 * The structure of the response is:
 *
 * {
 *  id: 20,
 *  version: 'all4',
 *  messages:
 *     [{
 *          id: 'f8ff6c80-aa61-11e7-a126-6119te37e2b8',
 *          version: '^2',
 *          content: 'Hallouuuu custom',
 *          top: true,
 *          dismissible: true,
 *          type: 'info'
 *      }],
 *  created_at: '2021-10-06T07:00:00.000Z',
 *  custom: 1,
 *  next_check: 1555608722
 * }
 *
 *
 * Example for grouped custom notifications in config:
 *
 *  "notificationGroups": ["migration", "something"]
 *
 * The group 'all' is a reserved name for general custom notifications, which every self hosted blog can receive.
 *
 * @param {Object} response
 * @return {Promise}
 */
function updateCheckResponse(response) {
    let notifications = [],
        notificationGroups = (config.get('notificationGroups') || []).concat(['all']);

    debug('Notification Groups', notificationGroups);
    debug('Response Update Check Service', response);

    return api.settings.edit({settings: [{key: 'next_update_check', value: response.next_check}]}, internal)
        .then(function () {
            /**
             * @NOTE:
             *
             * When we refactored notifications in Ghost 1.20, the service did not support returning multiple messages.
             * But we wanted to already add the support for future functionality.
             * That's why this helper supports two ways: returning an array of messages or returning an object with
             * a "notifications" key. The second one is probably the best, because we need to support "next_check"
             * on the root level of the response.
             */
            if (_.isArray(response)) {
                notifications = response;
            } else if ((Object.prototype.hasOwnProperty.call(response, 'notifications') && _.isArray(response.notifications))) {
                notifications = response.notifications;
            } else {
                // CASE: default right now
                notifications = [response];
            }

            // CASE: Hook into received notifications and decide whether you are allowed to receive custom group messages.
            if (notificationGroups.length) {
                notifications = notifications.filter(function (notification) {
                    // CASE: release notification, keep
                    if (!notification.custom) {
                        return true;
                    }

                    // CASE: filter out messages based on your groups
                    return _.includes(notificationGroups.map(function (groupIdentifier) {
                        if (notification.version.match(new RegExp(groupIdentifier))) {
                            return true;
                        }

                        return false;
                    }), true) === true;
                });
            }

            return Promise.each(notifications, createCustomNotification);
        });
}

/**
 * @description Entry point to trigger the update check unit.
 *
 * Based on a settings value, we check if `next_update_check` is less than now to decide whether
 * we should request the update check service (http://updates.ghost.org) or not.
 *
 * @returns {Promise}
 */
function updateCheck() {
    // CASE: The check will not happen if your NODE_ENV is not in the allowed defined environments.
    if (_.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        return Promise.resolve();
    }

    return api.settings.read(_.extend({key: 'next_update_check'}, internal))
        .then(function then(result) {
            const nextUpdateCheck = result.settings[0];

            // CASE: Next update check should happen now?
            // @NOTE: You can skip this check by adding a config value. This is helpful for developing.
            if (!config.get('updateCheck:forceUpdate') && nextUpdateCheck && nextUpdateCheck.value && nextUpdateCheck.value > moment().unix()) {
                return Promise.resolve();
            }

            return updateCheckRequest()
                .then(updateCheckResponse)
                .catch(updateCheckError);
        })
        .catch(updateCheckError);
}

module.exports = updateCheck;
