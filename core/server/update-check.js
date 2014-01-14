// # Update Checking Service
//
// Makes a request to Ghost.org to check if there is a new version of Ghost available.
// The service is provided in return for users opting in to anonymous usage data collection
// Blog owners can opt-out of update checks by setting 'updateCheck: false' in their config.js
//
// The data collected is as follows:
// - blog id - a hash of the blog hostname, pathname and dbHash, we do not store URL, IP or other identifiable info
// - ghost version
// - node version
// - npm version
// - env - production or development
// - database type - SQLite, MySQL, pg
// - email transport - mail.options.service, or otherwise mail.transport
// - created date - the date the database was created
// - post count - total number of posts
// - user count - total number of users
// - theme - name of the currently active theme
// - apps - names of any active plugins

var crypto   = require('crypto'),
    exec     = require('child_process').exec,
    https    = require('https'),
    moment   = require('moment'),
    semver   = require('semver'),
    when     = require('when'),
    nodefn   = require('when/node/function'),
    _        = require('underscore'),
    url      = require('url'),

    api      = require('./api'),
    config   = require('./config'),
    errors   = require('./errorHandling'),
    packageInfo = require('../../package.json'),

    allowedCheckEnvironments = ['development', 'production'],
    checkEndpoint = 'updates.ghost.org',
    currentVersion = packageInfo.version;

function updateCheckError(error) {
    errors.logError(
        error,
        "Checking for updates failed, your blog will continue to function.",
        "If you get this error repeatedly, please seek help from https://ghost.org/forum."
    );
}

function updateCheckData() {
    var data = {},
        ops = [],
        mailConfig = config().mail;

    ops.push(api.settings.read('dbHash').otherwise(errors.rejectError));
    ops.push(api.settings.read('activeTheme').otherwise(errors.rejectError));
    ops.push(api.settings.read('activePlugins')
        .then(function (apps) {
            try {
                apps = JSON.parse(apps.value);
            } catch (e) {
                return errors.rejectError(e);
            }

            return _.reduce(apps, function (memo, item) { return memo === '' ? memo + item : memo + ', ' + item; }, '');
        }).otherwise(errors.rejectError));
    ops.push(api.posts.browse().otherwise(errors.rejectError));
    ops.push(api.users.browse().otherwise(errors.rejectError));
    ops.push(nodefn.call(exec, 'npm -v').otherwise(errors.rejectError));

    data.ghost_version   = currentVersion;
    data.node_version    = process.versions.node;
    data.env             = process.env.NODE_ENV;
    data.database_type   = require('./models/base').client;
    data.email_transport = mailConfig && (mailConfig.options && mailConfig.options.service ? mailConfig.options.service : mailConfig.transport);

    return when.settle(ops).then(function (descriptors) {
        var hash             = descriptors[0].value,
            theme            = descriptors[1].value,
            apps             = descriptors[2].value,
            posts            = descriptors[3].value,
            users            = descriptors[4].value,
            npm              = descriptors[5].value,
            blogUrl          = url.parse(config().url),
            blogId           = blogUrl.hostname + blogUrl.pathname.replace(/\//, '') + hash.value;

        data.blog_id         = crypto.createHash('md5').update(blogId).digest('hex');
        data.theme           = theme ? theme.value : '';
        data.apps            = apps || '';
        data.post_count      = posts && posts.total ? posts.total : 0;
        data.user_count      = users && users.length ? users.length : 0;
        data.blog_created_at = users && users[0] && users[0].created_at ? moment(users[0].created_at).unix() : '';
        data.npm_version     = _.isArray(npm) && npm[0] ? npm[0].toString().replace(/\n/, '') : '';

        return data;
    }).otherwise(updateCheckError);
}

function updateCheckRequest() {
    return updateCheckData().then(function (reqData) {
        var deferred = when.defer(),
            resData = '',
            headers,
            req;

        reqData = JSON.stringify(reqData);

        headers = {
            'Content-Length': reqData.length
        };

        req = https.request({
            hostname: checkEndpoint,
            method: 'POST',
            headers: headers
        }, function (res) {
            res.on('error', function (error) { deferred.reject(error); });
            res.on('data', function (chunk) { resData += chunk; });
            res.on('end', function () {
                try {
                    resData = JSON.parse(resData);
                    deferred.resolve(resData);
                } catch (e) {
                    deferred.reject('Unable to decode update response');
                }
            });
        });

        req.write(reqData);
        req.end();

        req.on('error', function (error) {
            deferred.reject(error);
        });

        return deferred.promise;
    });
}

// ## Update Check Response
// Handles the response from the update check
// Does two things with the information received:
// 1. Updates the time we can next make a check
// 2. Checks if the version in the response is new, and updates the notification setting
function updateCheckResponse(response) {
    var ops = [];

    ops.push(api.settings.edit('nextUpdateCheck', response.next_check)
        .otherwise(errors.rejectError));

    ops.push(api.settings.edit('displayUpdateNotification', response.version)
                .otherwise(errors.rejectError));

    return when.settle(ops).then(function (descriptors) {
        descriptors.forEach(function (d) {
            if (d.state === 'rejected') {
                errors.rejectError(d.reason);
            }
        });
        return when.resolve();
    });
}

function updateCheck() {
    var deferred = when.defer();

    // The check will not happen if:
    // 1. updateCheck is defined as false in config.js
    // 2. we've already done a check this session
    // 3. we're not in production or development mode
    if (config().updateCheck === false || _.indexOf(allowedCheckEnvironments, process.env.NODE_ENV) === -1) {
        // No update check
        deferred.resolve();
    } else {
        api.settings.read('nextUpdateCheck').then(function (nextUpdateCheck) {
            if (nextUpdateCheck && nextUpdateCheck.value && nextUpdateCheck.value > moment().unix()) {
                // It's not time to check yet
                deferred.resolve();
            } else {
                // We need to do a check
                return updateCheckRequest()
                    .then(updateCheckResponse)
                    .otherwise(updateCheckError);
            }
        }).otherwise(updateCheckError)
            .then(deferred.resolve);
    }

    return deferred.promise;
}

function showUpdateNotification() {
    return api.settings.read('displayUpdateNotification').then(function (display) {
        // Version 0.4 used boolean to indicate the need for an update. This special case is
        // translated to the version string.
        // TODO: remove in future version.
        if (display.value === 'false' || display.value === 'true') {
            display.value = '0.4.0';
        }

        if (display && display.value && currentVersion && semver.gt(display.value, currentVersion)) {
            return when(true);
        }
        return when(false);
    });
}

module.exports = updateCheck;
module.exports.showUpdateNotification = showUpdateNotification;
