var _ = require('lodash'),
    http = require('http'),
    xml = require('xml'),
    config = require('../config'),
    urlService = require('../services/url'),
    common = require('../lib/common'),
    settingsCache = require('../settings/cache'),

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
    pingList = [{
        host: 'blogsearch.google.com',
        path: '/ping/RPC2'
    }, {
        host: 'rpc.pingomatic.com',
        path: '/'
    }];

function ping(post) {
    var pingXML,
        title = post.title,
        url = urlService.utils.urlFor('post', {post: post}, true);

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
            methodName: 'weblogUpdate.ping'
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
                hostname: pingHost.host,
                path: pingHost.path,
                method: 'POST'
            },
            req;

        req = http.request(options);
        req.write(pingXML);

        req.on('error', function handleError(err) {
            common.logging.error(new common.errors.GhostError({
                err: err,
                message: err.message,
                context: common.i18n.t('errors.services.ping.requestFailed.error', {service: 'slack'}),
                help: common.i18n.t('errors.services.ping.requestFailed.help', {url: 'http://docs.ghost.org'})
            }));
        });

        req.end();
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
