'use strict';

const _ = require('lodash'),
    localUtils = require('./utils'),
    prefetchDefaults = {
        context: {
            internal: true
        },
        limit: 'all'
    };

class Resource {
    constructor(config) {
        this.name = config.name;
        this.api = config.api;
        this.prefetchOptions = config.prefetchOptions || {};
        this.urlLookup = config.urlLookup || config.name;
        this.events = config.events;
        this.items = {};
    }

    fetchAll() {
        const options = _.defaults(this.prefetchOptions, prefetchDefaults);

        return require('../../api')[this.api]
            .browse(options)
            .then((resp) => {
                this.items = resp[this.api];
                return this.items;
            });
    }

    toUrl(item) {
        const data = {
            [this.urlLookup]: item
        };
        return localUtils.urlFor(this.urlLookup, data);
    }

    toData(item) {
        return {
            slug: item.slug,
            resource: {
                type: this.name,
                id: item.id
            }
        };
    }
}

module.exports = Resource;
