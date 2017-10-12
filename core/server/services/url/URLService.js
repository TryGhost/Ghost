var _ = require('lodash'),
    Promise = require('bluebird'),
    debug = require('ghost-ignition').debug('url-service'),
    // TODO: load this from a routing service, so it is dynamic
    resourceConfig = require('./config.json'),
    Resource = require('./Resource'),
    urlCache = require('./url-cache');

class UrlService {
    constructor() {
        this.resources = [];

        _.each(resourceConfig, (config) => {
            this.resources.push(new Resource(config));
        });
    }

    prefetch () {
        return Promise.each(this.resources, (resource) => {
            return resource.prefetch();
        });
    }

    loadAllUrls() {
        debug('load start');

        this.prefetch()
            .then(() => {
                debug('load end, start processing');

                _.each(this.resources, (resource) => {
                    _.each(resource.items, function (item) {
                        var url = resource.toUrl(item),
                            data = {
                                slug: item.slug,
                                resource: {
                                    type: resource.name,
                                    id: item.id
                                }
                            };

                        urlCache.set(url, data);
                    });
                });

                debug('processing done, url cache built', _.size(urlCache.getAll()));
                console.log(require('util').inspect(urlCache.getAll(), false, null));
            })
            .catch((err) => {
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
