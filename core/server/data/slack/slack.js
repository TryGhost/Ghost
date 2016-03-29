var https           = require('https'),
    errors          = require('../../errors'),
    url             = require('url'),
    Promise         = require('bluebird'),
    config          = require('../../config'),
    errors          = require('../../errors'),
    events          = require('../../events'),
    api             = require('../../api'),
    i18n            = require('../../i18n'),
    options,
    req,
    slack = {},
    slackData = {};

function getSlackSettings() {
    return api.settings.read({context: {internal: true}, key: 'slack'}).then(function (response) {
        var slackSetting = response.settings[0];

        try {
            slackSetting = JSON.parse(slackSetting) || slackSetting;
        } catch (e) {
            return Promise.reject(e);
        }

        slackSetting = JSON.parse(slackSetting.value) || '[{}]';
        slackSetting = slackSetting[0];

        return slackSetting;
    });
}

function makeRequest(reqOptions, reqPayload) {
    req = https.request(reqOptions);

    reqPayload = JSON.stringify(reqPayload);

    req.write(reqPayload);
    req.on('error', function (error) {
        errors.logError(
            error,
            i18n.t('errors.data.xml.xmlrpc.pingUpdateFailed.error'),
            i18n.t('errors.data.xml.xmlrpc.pingUpdateFailed.help', {url: 'http://support.ghost.org'})
        );
    });

    req.end();
}

function ping(post) {
    // we want to send the link of the post
    var textUrl = config.urlFor('post', {post: post}, true);

    return getSlackSettings().then(function (slackSettings) {
        // Quit here if slack integration is not activated
        if (slackSettings.isActive === 'true') {
            var channel, username;
            // Stop right here, if there is no url or the default url provided
            if (!slackSettings.url || slackSettings.url === '/') {
                return;
            }

            // Only ping when in production and not a page
            if (process.env.NODE_ENV !== 'production' || post.page || config.isPrivacyDisabled('useSlackPing')) {
                return;
            }

            // Don't ping for the welcome to ghost post.
            // This also handles the case where during ghost's first run
            // models.init() inserts this post but permissions.init() hasn't
            // (can't) run yet.

            if (post.slug === 'welcome-to-ghost') {
                return;
            }
            channel = slackSettings.channel ? slackSettings.channel : '';
            username = slackSettings.username ? slackSettings.username : '';

            slackData = {
                channel: channel,
                username: username,
                text: textUrl,
                icon_emoji: slackSettings.icon_emoji,
                unfurl_links: true
            };

            // fill the options for https request
            options = url.parse(slackSettings.url);
            options.method = 'POST';
            options.headers = {'Content-type': 'application/json'};

            // with all the data we have, we're doing the request now
            slack._makeRequest(options, slackData);
        } else {
            return;
        }
    });
}

function init() {
    events.on('post.published', function (model) {
        slack._ping(model.toJSON());
    });
}
slack.init = init;
slack._ping = ping;
slack._makeRequest = makeRequest;
module.exports = slack;
