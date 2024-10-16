const _ = require('lodash');
const debug = require('@tryghost/debug')('services:url:urls');
const urlUtils = require('../../../shared/url-utils');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

// This emits its own url added/removed events
const events = require('../../lib/common/events');

/**
 * This class keeps track of all urls in the system.
 * Each resource has exactly one url. Each url is owned by exactly one url generator id.
 * This is a connector for url generator and resources.
 * Stores relative urls by default.
 *
 * We have to have a centralized place where we keep track of all urls, otherwise
 * we will never know if we generate the same url twice. Furthermore, it's easier
 * to ask a centralized class instance if you want a url for a resource than
 * iterating over all url generators and asking for it.
 * You can easily ask `this.urls[resourceId]`.
 */
class Urls {
    /**
     *
     * @param {Object} [options]
     * @param {Object} [options.urls] map of available URLs with their resources
     */
    constructor({urls = {}} = {}) {
        this.urls = urls;
    }

    /**
     * @description Add a url to the system.
     * @param {Object} options
     * @param {import('./Resource')} options.resource - instance of the Resource class
     * @param {string} options.generatorId
     * @param {string} options.url
     */
    add(options) {
        const url = options.url;
        const generatorId = options.generatorId;
        const resource = options.resource;

        debug('cache', url);

        if (this.urls[resource.data.id]) {
            const error = new errors.InternalServerError({
                message: 'This should not happen.',
                code: 'URLSERVICE_RESOURCE_DUPLICATE'
            });
            if (process.env.NODE_ENV.startsWith('test')) {
                logging.warn({
                    message: 'Duplicate URL',
                    err: error
                });
            } else {
                logging.error(error);
            }

            this.removeResourceId(resource.data.id);
        }

        this.urls[resource.data.id] = {
            url: url,
            generatorId: generatorId,
            resource: resource
        };

        // @NOTE: Notify the whole system. Currently used for sitemaps service.
        events.emit('url.added', {
            url: {
                relative: url,
                absolute: urlUtils.createUrl(url, true)
            },
            resource: resource
        });
    }

    /**
     * @description Get url by resource id.
     * @param {String} id
     * @returns {Object}
     */
    getByResourceId(id) {
        return this.urls[id];
    }

    /**
     * @description Get all urls by generator id.
     * @param {String} generatorId
     * @returns {Array}
     */
    getByGeneratorId(generatorId) {
        return _.reduce(Object.keys(this.urls), (toReturn, resourceId) => {
            if (this.urls[resourceId].generatorId === generatorId) {
                toReturn.push(this.urls[resourceId]);
            }

            return toReturn;
        }, []);
    }

    /**
     * @description Get by url.
     *
     * @NOTE:
     * It's is in theory possible that:
     *
     *  - resource1 -> /welcome/
     *  - resource2 -> /welcome/
     *
     *  But depending on the routing registration, you will always serve e.g. resource1,
     *  because the router it belongs to was registered first.
     */
    getByUrl(url) {
        return _.reduce(Object.keys(this.urls), (toReturn, resourceId) => {
            if (this.urls[resourceId].url === url) {
                toReturn.push(this.urls[resourceId]);
            }

            return toReturn;
        }, []);
    }

    /**
     * @description Remove url.
     * @param id
     */
    removeResourceId(id) {
        if (!this.urls[id]) {
            return;
        }

        debug('removed', this.urls[id].url, this.urls[id].generatorId);

        events.emit('url.removed', {
            url: this.urls[id].url,
            resource: this.urls[id].resource
        });

        delete this.urls[id];
    }

    /**
     * @description Reset instance.
     */
    reset() {
        this.urls = {};
    }

    /**
     * @description Soft reset instance.
     */
    softReset() {
        this.urls = {};
    }
}

module.exports = Urls;
