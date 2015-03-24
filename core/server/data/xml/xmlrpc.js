var _               = require('lodash'),
    http            = require('http'),
    xml             = require('xml'),
    config          = require('../../config'),
    errors          = require('../../errors'),
    events          = require('../../events'),
    pingList;

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
        url = config.urlFor('post', {post: post}, true);

    // Only ping when in production and not a page
    if (process.env.NODE_ENV !== 'production' || post.page || config.isPrivacyDisabled('useRpcPing')) {
        return;
    }

    // Don't ping for the welcome to ghost post.
    // This also handles the case where during ghost's first run
    // models.init() inserts this post but permissions.init() hasn't
    // (can't) run yet.
    if (post.slug === 'welcome-to-ghost') {
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
        req.on('error', function (error) {
            errors.logError(
                error,
                'Pinging services for updates on your blog failed, your blog will continue to function.',
                'If you get this error repeatedly, please seek help from https://ghost.org/forum.'
            );
        });
        req.end();
    });
}

function init() {
    events.on('post.published', function (model) {
        ping(model.toJSON());
    });
}

module.exports = {
    init: init
};
