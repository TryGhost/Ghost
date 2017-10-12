// # Update Checking Service
//
// Makes a request to Ghost.org to check if there is a new version of Ghost available.
// The service is provided in return for users opting in to anonymous usage data collection.
//
// Blog owners can opt-out of update checks by setting `privacy: { useUpdateCheck: false }` in their config.js
//
// The data collected is as follows:
//
// - blog id - a hash of the blog hostname, pathname and dbHash. No identifiable info is stored.
// - ghost version
// - node version
// - npm version
// - env - production or development
// - database type - SQLite, MySQL, PostgreSQL
// - email transport - mail.options.service, or otherwise mail.transport
// - created date - database creation date
// - post count - total number of posts
// - user count - total number of users
// - theme - name of the currently active theme
// - apps - names of any active apps

var crypto   = require('crypto'),
    exec     = require('child_process').exec,
    https    = require('https'),
    http     = require('http'),
    uuid     = require('uuid'),
    moment   = require('moment'),
    querystring = require('querystring'),
    Promise  = require('bluebird'),
    _        = require('lodash'),
    url      = require('url'),

    api      = require('./api'),
    config   = require('./config'),
    errors   = require('./errors'),
    i18n     = require('./i18n'),
    internal = {context: {internal: true}},
    allowedCheckEnvironments = ['development', 'production'],
    currentVersion = config.ghostVersion;

function nextCheckTimestamp() {
    var now = Math.round(new Date().getTime() / 1000);
    return now + (24 * 3600);
}

function updateCheckError(error) {
    api.settings.edit({
        settings: [{
            key: 'nextUpdateCheck',
            value: nextCheckTimestamp()
        }]
    }, internal);

    errors.logError(
        error,
        i18n.t('errors.update-check.checkingForUpdatesFailed.error'),
        i18n.t('errors.update-check.checkingForUpdatesFailed.help', {url: 'http://docs.ghost.org/v0.11'})
    );
}

/**
 * If the custom message is intended for current version, create and store a custom notification.
 * @param {Object} message {id: uuid, version: '0.9.x', content: '' }
 * @return {*|Promise}
 */
function createCustomNotification(message) {
    if (!message || !message.content) {
        return Promise.resolve();
    }

    var notification = {
        status: message.status || 'alert',
        type: message.type || 'info',
        custom: true,
        id: message.id || uuid.v1(),
        dismissible: message.hasOwnProperty('dismissible') ? message.dismissible : true,
        // NOTE: not used in LTS
        top: true,
        message: message.content
    };

    return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
}

function updateCheckData() {
    var data = {},
        mailConfig = config.mail;

    data.ghost_version   = currentVersion;
    data.node_version    = process.versions.node;
    data.env             = process.env.NODE_ENV;
    data.database_type   = config.database.client;
    data.email_transport = mailConfig &&
    (mailConfig.options && mailConfig.options.service ?
        mailConfig.options.service :
        mailConfig.transport);

    return Promise.props({
        hash: api.settings.read(_.extend({key: 'dbHash'}, internal)).reflect(),
        theme: api.settings.read(_.extend({key: 'activeTheme'}, internal)).reflect(),
        apps: api.settings.read(_.extend({key: 'activeApps'}, internal))
            .then(function (response) {
                var apps = response.settings[0];

                apps = JSON.parse(apps.value);

                return _.reduce(apps, function (memo, item) { return memo === '' ? memo + item : memo + ', ' + item; }, '');
            }).reflect(),
        posts: api.posts.browse().reflect(),
        users: api.users.browse(internal).reflect(),
        npm: Promise.promisify(exec)('npm -v').reflect()
    }).then(function (descriptors) {
        var hash             = descriptors.hash.value().settings[0],
            theme            = descriptors.theme.value().settings[0],
            apps             = descriptors.apps.value(),
            posts            = descriptors.posts.value(),
            users            = descriptors.users.value(),
            npm              = descriptors.npm.value(),
            blogUrl          = url.parse(config.url),
            blogId           = blogUrl.hostname + blogUrl.pathname.replace(/\//, '') + hash.value;

        data.blog_id         = crypto.createHash('md5').update(blogId).digest('hex');
        data.theme           = theme ? theme.value : '';
        data.apps            = apps || '';
        data.post_count      = posts && posts.meta && posts.meta.pagination ? posts.meta.pagination.total : 0;
        data.user_count      = users && users.users && users.users.length ? users.users.length : 0;
        data.blog_created_at = users && users.users && users.users[0] && users.users[0].created_at ? moment(users.users[0].created_at).unix() : '';
        data.npm_version     = npm.trim();

        return data;
    }).catch(updateCheckError);
}

/**
 * With the privacy setting `useUpdateCheck` you can control if you want to expose data from your blog to the
 * Update Check Service. Enabled or disabled, you will receive the latest notification available from the service.
 */
function updateCheckRequest() {
    return updateCheckData().then(function then(reqData) {
        var resData = '',
            req,
            requestHandler,
            reqObj,
            checkEndpoint = config.updateCheckUrl || 'https://updates.ghost.org',
            checkMethod = config.isPrivacyDisabled('useUpdateCheck') ? 'GET' : 'POST',
            headers = {
                'Content-Type': 'application/json'
            };

        return new Promise(function p(resolve, reject) {
            requestHandler = checkEndpoint.indexOf('https') === 0 ? https : http;
            checkEndpoint = url.parse(checkEndpoint);

            reqObj = {
                hostname: checkEndpoint.hostname,
                port: checkEndpoint.port,
                method: checkMethod,
                headers: headers
            };

            if (checkMethod === 'POST') {
                reqData = JSON.stringify(reqData);
                headers['Content-Length'] = Buffer.byteLength(reqData);
            } else {
                reqObj.path = '/?' + querystring.stringify({
                    ghost_version: reqData.ghost_version
                });
            }

            req = requestHandler.request(reqObj, function handler(res) {
                res.on('error', function onError(error) { reject(error); });
                res.on('data', function onData(chunk) { resData += chunk; });
                res.on('end', function onEnd() {
                    try {
                        resData = JSON.parse(resData);

                        if (res.statusCode !== 200 && res.statusCode !== 201) {
                            // CASE: no notifications available, ignore
                            if (res.statusCode === 404) {
                                return resolve({
                                    next_check: nextCheckTimestamp(),
                                    notifications: []
                                });
                            }

                            return reject(new errors.BadRequestError(res.statusCode + ':' + JSON.stringify(resData)));
                        }

                        resolve(resData);
                    } catch (e) {
                        reject(new errors.BadRequestError(i18n.t('errors.update-check.unableToDecodeUpdateResponse.error') + ':' + resData));
                    }
                });
            });

            req.on('socket', function onSocket(socket) {
                // Wait a maximum of 10seconds
                socket.setTimeout(10000);
                socket.on('timeout', function onTimeout() {
                    req.abort();
                });
            });

            req.on('error', function onError(error) {
                reject(error);
            });

            if (checkMethod === 'POST') {
                req.write(reqData);
            }

            req.end();
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
    var notifications = [],
        notificationGroups = (config.notificationGroups || []).concat(['all']);

    return api.settings.edit({settings: [{key: 'nextUpdateCheck', value: response.next_check}]}, internal)
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

            return Promise.each(notifications, function (notification) {
                return Promise.map(notification.messages || [], createCustomNotification);
            });
        });
}

function updateCheck() {
    // CASE: The check will not happen if your NODE_ENV is not in the allowed defined environments.
    if (_.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        return Promise.resolve();
    }

    return api.settings.read(_.extend({key: 'nextUpdateCheck'}, internal))
        .then(function then(result) {
            var nextUpdateCheck = result.settings[0];

            // CASE: Next update check should happen now?
            if (nextUpdateCheck && nextUpdateCheck.value && nextUpdateCheck.value > moment().unix()) {
                return Promise.resolve();
            }

            return updateCheckRequest()
                .then(updateCheckResponse)
                .catch(updateCheckError);
        })
        .catch(updateCheckError);
}

module.exports = updateCheck;
