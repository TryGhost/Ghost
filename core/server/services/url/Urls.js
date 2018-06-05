const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:url:urls');
const localUtils = require('./utils');
const common = require('../../lib/common');

/**
 * Keeps track of all urls.
 * Each resource has exactly one url.
 *
 * Connector for url generator and resources.
 *
 * Stores relative urls by default.
 */
class Urls {
    constructor() {
        this.urls = {};
    }

    add(options) {
        const url = options.url;
        const generatorId = options.generatorId;
        const resource = options.resource;

        debug('cache', url);

        if (this.urls[resource.data.id]) {
            common.logging.error(new common.errors.InternalServerError({
                message: 'This should not happen.',
                code: 'URLSERVICE_RESOURCE_DUPLICATE'
            }));

            this.removeResourceId(resource.data.id);
        }

        this.urls[resource.data.id] = {
            url: url,
            generatorId: generatorId,
            resource: resource
        };

        common.events.emit('url.added', {
            url: {
                relative: url,
                absolute: localUtils.createUrl(url, true)
            },
            resource: resource
        });
    }

    // @TODO: add an option to receive an absolute url
    getByResourceId(id) {
        return this.urls[id];
    }

    /**
     * Get all by `uid`.
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

    removeResourceId(id) {
        if (!this.urls[id]) {
            return;
        }

        debug('removed', this.urls[id].url, this.urls[id].generatorId);

        common.events.emit('url.removed', {
            url: this.urls[id].url,
            resource: this.urls[id].resource
        });

        delete this.urls[id];
    }

    reset() {
        this.urls = {};
    }

    softReset() {
        this.urls = {};
    }
}

module.exports = Urls;
