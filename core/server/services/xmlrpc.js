var _ = require('lodash'),
    xml = require('xml'),
    config = require('../config'),
    urlService = require('../services/url'),
    common = require('../lib/common'),
    request = require('../lib/request'),
    settingsCache = require('./settings/cache'),

    defaultPostSlugs = [
        'welcome',
        'the-editor',
        'using-tags',
        'managing-users',
        'private-sites',
        'advanced-markdown',
        'themes'
    ],
    // ToDo: Make this configurable
    pingList = [
        {
            url: 'rpc.pingomatic.com'
        }
    ];

function ping(post) {
    var pingXML,
        title = post.title,
        url = urlService.getUrlByResourceId(post.id, {absolute: true});

    if (post.page || config.isPrivacyDisabled('useRpcPing') || settingsCache.get('is_private')) {
        return;
    }

    // Don't ping for the default posts.
    // This also handles the case where during ghost's first run
    // models.init() inserts this post but permissions.init() hasn't
    // (can't) run yet.
    if (defaultPostSlugs.indexOf(post.slug) > -1) {
        return;
    }

    // Build XML object.
    pingXML = xml({
        methodCall: [{
            methodName: 'weblogUpdates.ping'
        }, {
            params: [{
                param: [{
                    value: [{
                        string: title
                    }]
                }]
            }, {
                param: [{
                    value: [{
                        string: url
                    }]
                }]
            }]
        }]
    }, {declaration: true});

    // Ping each of the defined services.
    _.each(pingList, function (pingHost) {
        var options = {
            body: pingXML,
            timeout: 2 * 1000
        };

        const goodResponse = /<member>[\s]*<name>flerror<\/name>[\s]*<value>[\s]*<boolean>0<\/boolean><\/value><\/member>/;
        const errorMessage = /<name>(?:faultString|message)<\/name>[\s]*<value>[\s]*<string>([^<]+)/;

        request(pingHost.url, options)
            .then(function (res) {
                if (!goodResponse.test(res.body)) {
                    const matches = res.body.match(errorMessage);
                    const message = matches ? matches[1] : res.body;
                    throw new Error(message);
                }
            })
            .catch(function (err) {
                common.logging.error(new common.errors.GhostError({
                    err: err,
                    message: err.message,
                    context: common.i18n.t('errors.services.ping.requestFailed.error', {service: 'xmlrpc'}),
                    help: common.i18n.t('errors.services.ping.requestFailed.help', {url: 'https://docs.ghost.org'})
                }));
            });
    });
}

function listener(model, options) {
    // CASE: do not rpc ping if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    ping(model.toJSON());
}

function listen() {
    common.events.on('post.published', listener);
}

module.exports = {
    listen: listen
};
