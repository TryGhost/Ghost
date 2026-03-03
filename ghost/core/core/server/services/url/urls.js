const debug = require('@tryghost/debug')('services:url:urls');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {{url: string, generatorId: string, resource: import('./resource')}} Url
 */

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
    /** @type {Object<string, Url>} */
    urls = {};

    /**
     * @description Add a url to the system.
     * @param {Url} options
     */
    add({url, generatorId, resource}) {
        debug('add', resource.data.id, url);

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
    }

    /**
     * @description Get url by resource id.
     * @param {String} id
     * @returns {Url}
     */
    getByResourceId(id) {
        return this.urls[id];
    }

    /**
     * @description Get all urls by generator id.
     * @param {String} generatorId
     * @returns {Url[]}
     */
    getByGeneratorId(generatorId) {
        return Object.values(this.urls).filter(url => url.generatorId === generatorId);
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
     *
     *  @param {string} urlToLookup
     *  @returns {Url[]}
     */
    getByUrl(urlToLookup) {
        return Object.values(this.urls).filter(url => url.url === urlToLookup);
    }

    /**
     * @description Remove url.
     * @param {string} id
     * @returns {Url|undefined} the removed entry, or undefined if not found
     */
    removeResourceId(id) {
        if (!this.urls[id]) {
            return;
        }

        debug('removeResourceId', this.urls[id].url, this.urls[id].generatorId);

        const removed = this.urls[id];
        delete this.urls[id];
        return removed;
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
