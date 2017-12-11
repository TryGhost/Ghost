'use strict';
// Based heavily on the settings cache
const _ = require('lodash'),
    debug = require('ghost-ignition').debug('services:url:cache'),
    common = require('../../lib/common'),
    urlCache = {};

module.exports = {
    /**
     * Get the entire cache object
     * Uses clone to prevent modifications from being reflected
     * @return {{}} urlCache
     */
    getAll() {
        return _.cloneDeep(urlCache);
    },
    set(key, value) {
        const existing = this.get(key);

        if (!existing) {
            debug('adding url', key);
            urlCache[key] = _.cloneDeep(value);
            common.events.emit('url.added', key, value);
        } else if (!_.isEqual(value, existing)) {
            debug('overwriting url', key);
            urlCache[key] = _.cloneDeep(value);
            common.events.emit('url.edited', key, value);
        }
    },
    unset(key) {
        const value = this.get(key);
        delete urlCache[key];
        debug('removing url', key);
        common.events.emit('url.removed', key, value);
    },
    get(key) {
        return _.cloneDeep(urlCache[key]);
    }
};
