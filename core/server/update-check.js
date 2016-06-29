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

/**
 * Default error handler for update check promises. In case of a promise
 * failure, "nextUpdateCheck" is set to 24 hours from now.
 * @param error
 */
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
 * Prepares fields to be submitted to UpdateCheck service.
 *
 * @returns {*} an object accepted by UpdateCheck service.
 */
function prepareBlogSnapshot() {
    var data = {},
        mailConfig = config.mail;

    /**
     * Converts "activeApps" into a string of comma separated values.
     * @param response
     * @returns {*}
     */
    var appsToCsv = function(response) {
        var apps = response.settings[0];

        try {
            apps = JSON.parse(apps.value);
        } catch(e) {
            return errors.rejectError(e);
        }

        return _.reduce(apps, function(memo, item) {
            return memo === '' ? memo + item : memo + ', ' + item;
        }, '');
    };

    return Promise.props({
        hash: api.settings.read(_.extend({key: 'dbHash'}, internal)).reflect(),
        theme: api.settings.read(_.extend({key: 'activeTheme'}, internal)).reflect(),
        apps: api.settings.read(_.extend({key: 'activeApps'}, internal)).then(appsToCsv).reflect(),
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
        data.npm_version     = _.isArray(npm) && npm[0] ? npm[0].toString().replace(/\n/, '') : '';
        data.ghost_version   = currentVersion;
        data.node_version    = process.versions.node;
        data.env             = process.env.NODE_ENV;
        data.database_type   = config.database.client;
        data.email_transport = mailConfig && (mailConfig.options && mailConfig.options.service ? mailConfig.options.service : mailConfig.transport);
        return data;
    }).catch(updateCheckError);
}

/**
 * Constructs POST request to submit snapshot to UpdateCheck service.
 *
 * @returns {*}
 */
function updateCheckRequest() {
    return prepareBlogSnapshot().then(function then(snapshot) {
        var resData = '',
            headers,
            req;

        snapshot = JSON.stringify(snapshot);

        headers = {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(snapshot)
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

            req.write(snapshot);
            req.end();
        });
    });
}

/**
 * Update Check Response. Handles the response from UpdateCheck service. On response:
 * 1. Updates the time we can next make a check
 * 2. Checks if the version in the response is new, and updates the notification setting
 * @param response
 * @returns {Promise}
 */
function updateCheckResponse(response) {
    var ops = [];

    ops.push(
        api.settings.edit(
            {settings: [{key: 'nextUpdateCheck', value: response.next_check}]},
            internal
        ),
        api.settings.edit(
            {settings: [{key: 'displayUpdateNotification', value: response.release.name}]},
            internal
        )
    );

    return Promise.all(ops);
}

/**
 * The check will not happen if:
 * 1. updateCheck is defined as false in config.js
 * 2. we've already done a check this session
 * 3. we're not in production or development mode
 * @returns {*}
 */
function updateCheck() {
    // TODO: need to remove config.updateCheck in favor of config.privacy.updateCheck in future version (it is now deprecated)
    if(config.updateCheck === false || config.isPrivacyDisabled('useUpdateCheck') || _.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        // No update check
        return Promise.resolve();
    }

    /**
     * Evaluates to true if "nextUpdateCheck" > current time
     * @param nextUpdateCheck
     * @returns {*|boolean}
     */
    var isItTimeToCheckIn = function(nextUpdateCheck) {
        nextUpdateCheck = nextUpdateCheck.settings[0];
        return nextUpdateCheck && nextUpdateCheck.value && nextUpdateCheck.value > moment().unix();
    };

    return api.settings.read(_.extend({key: 'nextUpdateCheck'}, internal))
    .then(function then(result) {

        // If it's not time to check yet, do nothing.
        if(!isItTimeToCheckIn(result)) {
            return;
        }

        return updateCheckRequest()
        .then(updateCheckResponse)
        .catch(updateCheckError);
    })
    .catch(updateCheckError);

}


function getUpdateNotifications() {
    return api.settings.read(_.extend({key: 'displayUpdateNotification'}, internal)).then(function then(response) {
        var notifications = [];

        _.each(response.settings, function(notification) {
            // Version 0.4 used boolean to indicate the need for an update. This special case is
            // translated to the version string.
            // TODO: remove in future version.
            if(notification.value === 'false' || notification.value === 'true' || notification.value === '1' || notification.value === '0') {
                notification.value = '0.4.0';
            }

            if(notification && notification.value && currentVersion && semver.gt(notification.value, currentVersion)) {
                notifications.push(notification);
            }
        });

        return notifications;
    });
}

module.exports = updateCheck;
module.exports.getUpdateNotifications = getUpdateNotifications;
