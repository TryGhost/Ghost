var common = require('../lib/common'),
    request = require('../lib/request'),
    imageLib = require('../lib/image'),
    urlService = require('../services/url'),
    settingsCache = require('./settings/cache'),
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

function ping(post) {
    var message,
        slackData = {},
        slackSettings = getSlackSettings();

    // If this is a post, we want to send the link of the post
    if (schema.isPost(post)) {
        message = urlService.getUrlByResourceId(post.id, {absolute: true});
    } else {
        message = post.message;
    }

    // Quit here if slack integration is not activated
    if (slackSettings && slackSettings.url && slackSettings.url !== '') {
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
            icon_url: imageLib.blogIcon.getIconUrl(true),
            username: 'Ghost'
        };

        return request(slackSettings.url, {
            body: JSON.stringify(slackData),
            headers: {
                'Content-type': 'application/json'
            }
        }).catch(function (err) {
            common.logging.error(new common.errors.GhostError({
                err: err,
                context: common.i18n.t('errors.services.ping.requestFailed.error', {service: 'slack'}),
                help: common.i18n.t('errors.services.ping.requestFailed.help', {url: 'https://docs.ghost.org'})
            }));
        });
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
        message: 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!'
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
