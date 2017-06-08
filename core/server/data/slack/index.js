var https           = require('https'),
    url             = require('url'),
    Promise         = require('bluebird'),
    errors          = require('../../errors'),
    logging         = require('../../logging'),
    utils           = require('../../utils'),
    blogIconUtils   = require('../../utils/blog-icon'),
    events          = require('../../events'),
    api             = require('../../api/settings'),
    i18n            = require('../../i18n'),
    schema          = require('../schema').checks,
    req,
    slackData = {};

function getSlackSettings() {
    return api.read({context: {internal: true}, key: 'slack'}).then(function (response) {
        var slackSetting = response.settings[0].value;

        try {
            slackSetting = JSON.parse(slackSetting);
        } catch (e) {
            return Promise.reject(e);
        }

        return slackSetting[0];
    });
}

function makeRequest(reqOptions, reqPayload) {
    req = https.request(reqOptions);

    reqPayload = JSON.stringify(reqPayload);

    req.write(reqPayload);
    req.on('error', function (err) {
        logging.error(new errors.GhostError({
            err: err,
            context: i18n.t('errors.data.xml.xmlrpc.pingUpdateFailed.error'),
            help: i18n.t('errors.data.xml.xmlrpc.pingUpdateFailed.help', {url: 'http://docs.ghost.org'})
        }));
    });

    req.end();
}

function ping(post, options) {
    options = options || {};

    var message, reqOptions;

    // CASE: do not ping slack if we import a database
    if (options.importing) {
        return Promise.resolve();
    }

    // If this is a post, we want to send the link of the post
    if (schema.isPost(post)) {
        message = utils.url.urlFor('post', {post: post}, true);
    } else {
        message = post.message;
    }

    return getSlackSettings().then(function (slackSettings) {
        // Quit here if slack integration is not activated
        var defaultPostSlugs = [
            'welcome',
            'the-editor',
            'using-tags',
            'managing-users',
            'private-sites',
            'advanced-markdown',
            'themes'
        ];

        if (slackSettings.url && slackSettings.url !== '') {
            // Only ping when not a page
            if (post.page) {
                return;
            }

            // Don't ping for the default posts.
            // This also handles the case where during ghost's first run
            // models.init() inserts this post but permissions.init() hasn't
            // (can't) run yet.
            if (defaultPostSlugs.indexOf(post.slug) > -1) {
                return;
            }

            slackData = {
                text: message,
                unfurl_links: true,
                icon_url: blogIconUtils.getIconUrl(true),
                username: 'Ghost'
            };

            // fill the options for https request
            reqOptions = url.parse(slackSettings.url);
            reqOptions.method = 'POST';
            reqOptions.headers = {'Content-type': 'application/json'};

            // with all the data we have, we're doing the request now
            makeRequest(reqOptions, slackData);
        } else {
            return;
        }
    });
}

function listener(model, options) {
    ping(model.toJSON(), options);
}

function testPing() {
    ping({
        message: 'Heya! This is a test notification from your Ghost blog :simple_smile:. Seems to work fine!'
    });
}

function listen() {
    events.on('post.published', listener);
    events.on('slack.test', testPing);
}

// Public API
module.exports = {
    listen: listen
};
