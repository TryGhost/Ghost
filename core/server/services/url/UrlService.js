'use strict';

/**
 * # URL Service
 *
 * This file defines a class of URLService, which serves as a centralised place to handle
 * generating, storing & fetching URLs of all kinds.
 */

const _ = require('lodash'),
    Promise = require('bluebird'),
    _debug = require('ghost-ignition').debug._base,
    debug = _debug('ghost:services:url'),
    events = require('../../events'),
    // TODO: make this dynamic
    resourceConfig = require('./config.json'),
    Resource = require('./Resource'),
    urlCache = require('./cache'),
    utils = require('../../utils');

class UrlService {
    constructor() {
        this.resources = [];

        _.each(resourceConfig, (config) => {
            this.resources.push(new Resource(config));
        });
    }

    bind() {
        const eventHandlers = {
            add(model, resource) {
                UrlService.cacheResourceItem(resource, model.toJSON());
            },
            update(model, resource) {
                const newItem = model.toJSON();
                const oldItem = model.updatedAttributes();

                const oldUrl = resource.toUrl(oldItem);
                const storedData = urlCache.get(oldUrl);

                const newUrl = resource.toUrl(newItem);
                const newData = resource.toData(newItem);

                debug('update', oldUrl, newUrl);
                if (oldUrl && oldUrl !== newUrl && storedData) {
                    // CASE: we are updating a cached item and the URL has changed
                    debug('Changing URL, unset first');
                    urlCache.unset(oldUrl);
                }

                // CASE: the URL is either new, or the same, this will create or update
                urlCache.set(newUrl, newData);
            },

            remove(model, resource) {
                const url = resource.toUrl(model.toJSON());
                urlCache.unset(url);
            },

            reload(model, resource) {
                // @TODO: get reload working, so that permalink changes are reflected
                // NOTE: the current implementation of sitemaps doesn't have this
                debug('Need to reload all resources: ' + resource.name);
            }
        };

        _.each(this.resources, (resource) => {
            _.each(resource.events, (method, eventName) => {
                events.on(eventName, (model) => {
                    eventHandlers[method].call(this, model, resource, eventName);
                });
            });
        });
    }

    fetchAll() {
        return Promise.each(this.resources, (resource) => {
            return resource.fetchAll();
        });
    }

    loadResourceUrls() {
        debug('load start');

        this.fetchAll()
            .then(() => {
                debug('load end, start processing');

                _.each(this.resources, (resource) => {
                    _.each(resource.items, (item) => {
                        UrlService.cacheResourceItem(resource, item);
                    });
                });

                debug('processing done, url cache built. Number urls', _.size(urlCache.getAll()));
                // Wrap this in a check, because else this is a HUGE amount of output
                // To output this, use DEBUG=ghost:*,ghost-url
                if (_debug.enabled('ghost-url')) {
                    debug('url-cache', require('util').inspect(urlCache.getAll(), false, null));
                }
            })
            .catch((err) => {
                debug('load error', err);
            });
    }

    static cacheResourceItem(resource, item) {
        const url = resource.toUrl(item);
        const data = resource.toData(item);

        urlCache.set(url, data);
    }

    static cacheRoute(relativeUrl, data) {
        const url = utils.url.urlFor({relativeUrl: relativeUrl});
        data.static = true;
        urlCache.set(url, data);
    }
}

module.exports = UrlService;
