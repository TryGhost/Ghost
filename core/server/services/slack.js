var https = require('https'),
    url = require('url'),
    common = require('../lib/common'),
    urlService = require('../services/url'),
    blogIconUtils = require('../utils/blog-icon'),
    settingsCache = require('../settings/cache'),
    schema = require('../data/schema').checks,
    defaultPostSlugs = [
        'welcome',
        'the-editor',
        'using-tags',
        'managing-users',
        'private-sites',
        'advanced-markdown',
        'themes'
    ];

function getSlackSettings() {
    var setting = settingsCache.get('slack');
    // This might one day have multiple entries, for now its always a array
    // and we return the first item or an empty object
    return setting ? setting[0] : {};
}

function makeRequest(reqOptions, reqPayload) {
    var req = https.request(reqOptions);

    reqPayload = JSON.stringify(reqPayload);

    req.write(reqPayload);
    req.on('error', function (err) {
        common.logging.error(new common.errors.GhostError({
            err: err,
            context: common.i18n.t('errors.services.ping.requestFailed.error', {service: 'slack'}),
            help: common.i18n.t('errors.services.ping.requestFailed.help', {url: 'http://docs.ghost.org'})
        }));
    });

    req.end();
}

function ping(post) {
    var message,
        reqOptions,
        slackData = {},
        slackSettings = getSlackSettings();

    // If this is a post, we want to send the link of the post
    if (schema.isPost(post)) {
        message = urlService.utils.urlFor('post', {post: post}, true);
    } else {
        message = post.message;
    }
    // Quit here if slack integration is not activated
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
    }
}

function listener(model, options) {
    // CASE: do not ping slack if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    ping(model.toJSON());
}

function testPing() {
    ping({
        message: 'Heya! This is a test notification from your Ghost blog :simple_smile:. Seems to work fine!'
    });
}

function listen() {
    common.events.on('post.published', listener);
    common.events.on('slack.test', testPing);
}

// Public API
module.exports = {
    listen: listen
};
