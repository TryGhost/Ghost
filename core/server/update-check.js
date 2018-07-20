// # Update Checking Service
//
// Makes a request to Ghost.org to check if there is a new version of Ghost available.
// The service is provided in return for users opting in to anonymous usage data collection.
//
// Blog owners can opt-out of update checks by setting `privacy: { useUpdateCheck: false }` in their config.js
//
// The data collected is as follows:
//
// - blog id - a hash of the blog hostname, pathname and db_hash. No identifiable info is stored.
// - ghost version
// - node version
// - npm version
// - env - production or development
// - database type - SQLite, MySQL
// - email transport - mail.options.service, or otherwise mail.transport
// - created date - database creation date
// - post count - total number of posts
// - user count - total number of users
// - theme - name of the currently active theme
// - apps - names of any active apps

const crypto = require('crypto'),
    exec = require('child_process').exec,
    moment = require('moment'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    url = require('url'),
    debug = require('ghost-ignition').debug('update-check'),
    api = require('./api'),
    config = require('./config'),
    urlService = require('./services/url'),
    common = require('./lib/common'),
    request = require('./lib/request'),
    ghostVersion = require('./lib/ghost-version'),
    internal = {context: {internal: true}},
    allowedCheckEnvironments = ['development', 'production'];

function nextCheckTimestamp() {
    var now = Math.round(new Date().getTime() / 1000);
    return now + (24 * 3600);
}

function updateCheckError(err) {
    api.settings.edit({
        settings: [{
            key: 'next_update_check',
            value: nextCheckTimestamp()
        }]
    }, internal);

    err.context = common.i18n.t('errors.updateCheck.checkingForUpdatesFailed.error');
    err.help = common.i18n.t('errors.updateCheck.checkingForUpdatesFailed.help', {url: 'https://docs.ghost.org'});
    common.logging.error(err);
}

/**
 * If the custom message is intended for current version, create and store a custom notification.
 * @param {Object} notification
 * @return {*|Promise}
 */
function createCustomNotification(notification) {
    if (!notification) {
        return Promise.resolve();
    }

    return Promise.each(notification.messages, function (message) {
        let toAdd = {
            custom: !!notification.custom,
            createdAt: moment(notification.created_at).toDate(),
            status: message.status || 'alert',
            type: message.type || 'info',
            id: message.id,
            dismissible: message.hasOwnProperty('dismissible') ? message.dismissible : true,
            top: !!message.top,
            message: message.content
        };

        debug('Add Custom Notification', toAdd);
        return api.notifications.add({notifications: [toAdd]}, {context: {internal: true}});
    });
}

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
        apps: api.settings.read(_.extend({key: 'active_apps'}, internal))
            .then(function (response) {
                var apps = response.settings[0];

                apps = JSON.parse(apps.value);

                return _.reduce(apps, function (memo, item) {
                    return memo === '' ? memo + item : memo + ', ' + item;
                }, '');
            }).reflect(),
        posts: api.posts.browse().reflect(),
        users: api.users.browse(internal).reflect(),
        npm: Promise.promisify(exec)('npm -v').reflect()
    }).then(function (descriptors) {
        var hash = descriptors.hash.value().settings[0],
            theme = descriptors.theme.value().settings[0],
            apps = descriptors.apps.value(),
            posts = descriptors.posts.value(),
            users = descriptors.users.value(),
            npm = descriptors.npm.value(),
            blogUrl = url.parse(urlService.utils.urlFor('home', true)),
            blogId = blogUrl.hostname + blogUrl.pathname.replace(/\//, '') + hash.value;

        data.blog_id = crypto.createHash('md5').update(blogId).digest('hex');
        data.theme = theme ? theme.value : '';
        data.apps = apps || '';
        data.post_count = posts && posts.meta && posts.meta.pagination ? posts.meta.pagination.total : 0;
        data.user_count = users && users.users && users.users.length ? users.users.length : 0;
        data.blog_created_at = users && users.users && users.users[0] && users.users[0].created_at ? moment(users.users[0].created_at).unix() : '';
        data.npm_version = npm.trim();
        data.lts = false;

        return data;
    }).catch(updateCheckError);
}

/**
 * With the privacy setting `useUpdateCheck` you can control if you want to expose data from your blog to the
 * Update Check Service. Enabled or disabled, you will receive the latest notification available from the service.
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

                    if (err.response && err.response.body && typeof err.response.body === 'object') {
                        err = common.errors.utils.deserialize(err.response.body);
                    }

                    throw err;
                });
        });
}

/**
 * Handles the response from the update check
 * Does three things with the information received:
 * 1. Updates the time we can next make a check
 * 2. Create custom notifications is response from UpdateCheck as "messages" array which has the following structure:
 *
 * "messages": [{
 *   "id": ed9dc38c-73e5-4d72-a741-22b11f6e151a,
 *   "version": "0.5.x",
 *   "content": "<p>Hey there! 0.6 is available, visit <a href=\"https://ghost.org/download\">Ghost.org</a> to grab your copy now<!/p>",
 *   "dismissible": true | false,
 *   "top": true | false
 * ]}
 *
 * Example for grouped custom notifications in config:
 *
 * notificationGroups: ['migration', 'something']
 *
 * 'all' is a reserved name for general custom notifications.
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
            // CASE: Update Check Service returns multiple notifications.
            if (_.isArray(response)) {
                notifications = response;
            } else if ((response.hasOwnProperty('notifications') && _.isArray(response.notifications))) {
                notifications = response.notifications;
            } else {
                notifications = [response];
            }

            // CASE: Hook into received notifications and decide whether you are allowed to receive custom group messages.
            if (notificationGroups.length) {
                notifications = notifications.filter(function (notification) {
                    if (!notification.custom) {
                        return true;
                    }

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

function updateCheck() {
    // CASE: The check will not happen if your NODE_ENV is not in the allowed defined environments.
    if (_.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        return Promise.resolve();
    }

    return api.settings.read(_.extend({key: 'next_update_check'}, internal))
        .then(function then(result) {
            var nextUpdateCheck = result.settings[0];

            // CASE: Next update check should happen now?
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
