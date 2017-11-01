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
