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
    moment   = require('moment'),
    semver   = require('semver'),
    Promise  = require('bluebird'),
    _        = require('lodash'),
    url      = require('url'),

    api      = require('./api'),
    config   = require('./config'),
    errors   = require('./errors'),
    i18n     = require('./i18n'),
    internal = {context: {internal: true}},
    allowedCheckEnvironments = ['development', 'production'],
    checkEndpoint = 'updates.ghost.org',
    currentVersion = config.ghostVersion;

function updateCheckError(error) {
    api.settings.edit(
        {settings: [{key: 'nextUpdateCheck', value: Math.round(Date.now() / 1000 + 24 * 3600)}]},
        internal
    );

    errors.logError(
        error,
        i18n.t('errors.update-check.checkingForUpdatesFailed.error'),
        i18n.t('errors.update-check.checkingForUpdatesFailed.help', {url: 'http://support.ghost.org'})
    );
}

/**
 * If the custom message is intended for current version, create and store a custom notification.
 * @param {Object} message {id: uuid, version: '0.9.x', content: '' }
 * @return {*|Promise}
 */
function createCustomNotification(message) {
    if (!semver.satisfies(currentVersion, message.version)) {
        return Promise.resolve();
    }

    var notification = {
        status: 'alert',
        type: 'info',
        custom: true,
        uuid: message.id,
        dismissible: true,
        message: message.content
    },
    getAllNotifications = api.notifications.browse({context: {internal: true}}),
    getSeenNotifications = api.settings.read(_.extend({key: 'seenNotifications'}, internal));

    return Promise.join(getAllNotifications, getSeenNotifications, function joined(all, seen) {
        var isSeen      = _.includes(JSON.parse(seen.settings[0].value || []), notification.uuid),
            isDuplicate = _.some(all.notifications, {message: notification.message});

        if (!isSeen && !isDuplicate) {
            return api.notifications.add({notifications: [notification]}, {context: {internal: true}});
        }
    });
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

function updateCheckRequest() {
    return updateCheckData().then(function then(reqData) {
        var resData = '',
            headers,
            req;

        reqData = JSON.stringify(reqData);

        headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(reqData)
        };

        return new Promise(function p(resolve, reject) {
            req = https.request({
                hostname: checkEndpoint,
                method: 'POST',
                headers: headers
            }, function handler(res) {
                res.on('error', function onError(error) { reject(error); });
                res.on('data', function onData(chunk) { resData += chunk; });
                res.on('end', function onEnd() {
                    try {
                        resData = JSON.parse(resData);
                        resolve(resData);
                    } catch (e) {
                        reject(i18n.t('errors.update-check.unableToDecodeUpdateResponse.error'));
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

            req.write(reqData);
            req.end();
        });
    });
}

/**
 * Handles the response from the update check
 * Does three things with the information received:
 * 1. Updates the time we can next make a check
 * 2. Checks if the version in the response is new, and updates the notification setting
 * 3. Create custom notifications is response from UpdateCheck as "messages" array which has the following structure:
 *
 * "messages": [{
 *   "id": ed9dc38c-73e5-4d72-a741-22b11f6e151a,
 *   "version": "0.5.x",
 *   "content": "<p>Hey there! 0.6 is available, visit <a href=\"https://ghost.org/download\">Ghost.org</a> to grab your copy now<!/p>"
 * ]}
 *
 * @param {Object} response
 * @return {Promise}
 */
function updateCheckResponse(response) {
    return Promise.all([
        api.settings.edit({settings: [{key: 'nextUpdateCheck', value: response.next_check}]}, internal),
        api.settings.edit({settings: [{key: 'displayUpdateNotification', value: response.version}]}, internal)
    ]).then(function () {
        var messages = response.messages || [];
        return Promise.map(messages, createCustomNotification);
    });
}

function updateCheck() {
    // The check will not happen if:
    // 1. updateCheck is defined as false in config.js
    // 2. we've already done a check this session
    // 3. we're not in production or development mode
    // TODO: need to remove config.updateCheck in favor of config.privacy.updateCheck in future version (it is now deprecated)
    if (config.updateCheck === false || config.isPrivacyDisabled('useUpdateCheck') || _.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        // No update check
        return Promise.resolve();
    } else {
        return api.settings.read(_.extend({key: 'nextUpdateCheck'}, internal)).then(function then(result) {
            var nextUpdateCheck = result.settings[0];

            if (nextUpdateCheck && nextUpdateCheck.value && nextUpdateCheck.value > moment().unix()) {
                // It's not time to check yet
                return;
            } else {
                // We need to do a check
                return updateCheckRequest()
                    .then(updateCheckResponse)
                    .catch(updateCheckError);
            }
        }).catch(updateCheckError);
    }
}

function showUpdateNotification() {
    return api.settings.read(_.extend({key: 'displayUpdateNotification'}, internal)).then(function then(response) {
        var display = response.settings[0];

        // Version 0.4 used boolean to indicate the need for an update. This special case is
        // translated to the version string.
        // TODO: remove in future version.
        if (display.value === 'false' || display.value === 'true' || display.value === '1' || display.value === '0') {
            display.value = '0.4.0';
        }

        if (display && display.value && currentVersion && semver.gt(display.value, currentVersion)) {
            return display.value;
        }

        return false;
    });
}

module.exports = updateCheck;
module.exports.showUpdateNotification = showUpdateNotification;
