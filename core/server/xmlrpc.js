var _               = require('lodash'),
    config          = require('./config'),
    errors          = require('./errorHandling'),
    http            = require('http'),
    xml             = require('xml'),
    pingList;

// ToDo: Make this configurable
pingList = [
    { host: 'blogsearch.google.com', path: '/ping/RPC2' },
    { host: 'rpc.pingomatic.com', path: '/' }
];

function ping(post) {
    var pingXML,
        title = post.title;

    // Only ping when in production and not a page
    if (process.env.NODE_ENV !== 'production' || post.page) {
        return;
    }

    // Need to require here because of circular dependency
    return config.urlForPost(require('./api').settings, post, true).then(function (url) {

        // Build XML object.
        pingXML = xml({
            methodCall: [
                { methodName: 'weblogUpdate.ping' },
                {
                    params: [{
                        param: [{ value: [{ string: title }]}],
                    }, {
                        param: [{ value: [{ string: url }]}],
                    }]
                }
            ]
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
                    "Pinging services for updates on your blog failed, your blog will continue to function.",
                    "If you get this error repeatedly, please seek help from https://ghost.org/forum."
                );
            });
            req.end();
        });
    });
}

module.exports = {
    ping: ping
};