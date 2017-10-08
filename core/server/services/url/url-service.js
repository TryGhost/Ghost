var _ = require('lodash'),
    Promise = require('bluebird'),
    debug = require('ghost-ignition').debug('url-service'),
    resources = require('./config'),
    urlCache = require('./url-cache');

function buildList() {
    var props = {};

    _.each(resources, function buildProps(resource, resourceName) {
        props[resourceName] = resource.prefetch();
    });

    return Promise.props(props);
}


class UrlService {
    constructor() {

    }

    loadAllUrls() {
        debug('load start');

        buildList()
            .then(function success(response) {
                debug('load end, start processing');

                _.each(response, function (items, resourceName) {
                    var defaults = resources[resourceName];
                    _.each(items, function (resource) {
                        var url = defaults.toUrl(resource),
                            data = {
                                resourceType: resourceName,
                                identifier: resource.id
                            };


                        urlCache.set(url, data);
                    });
                });

                debug('processing done, url cache built', _.size(urlCache.getAll()));
                console.log(require('util').inspect(urlCache.getAll(), false, null));
            })
            .catch(function error(err) {
                debug('load error', err);
            });
    }

    // registerAddEvent(eventName) {
    //     events.on(eventName, addOrUpdateUrlCache);
    // }
    //
    // registerRemoveEvent(eventName) {
    //
    // }
}

module.exports = UrlService;
