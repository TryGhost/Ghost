const EventEmitter = require('events').EventEmitter;
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * Resource cache.
 */
class Resource extends EventEmitter {
    /**
     * @param {('posts'|'pages'|'tags'|'authors')} type - of the resource
     * @param {Object} obj - object data to sotre
     */
    constructor(type, obj) {
        super();

        this.data = {};
        this.config = {
            type: type,
            reserved: false
        };

        Object.assign(this.data, obj);
    }

    /**
     * @description Get the type of the resource e.g. posts, users ...
     * @returns {String} type
     */
    getType() {
        return this.config.type;
    }

    /**
     * @description Reserve a resource.
     *
     * This happens if a url generator's conditions matches a resource.
     * We have to reserve resources, because otherwise resources can appear in multiple url structures.
     */
    reserve() {
        if (!this.config.reserved) {
            this.config.reserved = true;
        } else {
            logging.error(new errors.InternalServerError({
                message: 'Resource is already taken. This should not happen.',
                code: 'URLSERVICE_RESERVE_RESOURCE'
            }));
        }
    }

    /**
     * @description Release a resource.
     *
     * This happens if conditions of a url generator no longer matches a resource.
     * e.g. change a post to a page.
     */
    release() {
        this.config.reserved = false;
    }

    /**
     * @description Check whether a resource is reserved.
     * @returns {boolean}
     */
    isReserved() {
        return this.config.reserved === true;
    }

    /**
     * @description Update the resource cache.
     *
     * Emit update to subscribers - observer pattern.
     * e.g. url generator will listen on it's own resource's.
     *
     * @param {Object} obj - raw resource data
     */
    update(obj) {
        Object.assign(this.data, obj);

        if (!this.isReserved()) {
            return;
        }

        this.emit('updated', this);
    }

    /**
     * @description Remove a resource.
     *
     * The fn is only useful to emit the action/event right now.
     *
     * CASE: url generator needs to know if one of it's resources/url should be removed.
     */
    remove() {
        // CASE: do not emit, if it is not reserved, because nobody will listen on events.
        if (!this.isReserved()) {
            return;
        }

        this.emit('removed', this);
    }
}

module.exports = Resource;
