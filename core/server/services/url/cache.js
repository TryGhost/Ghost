'use strict';
// Based heavily on the settings cache
const _ = require('lodash'),
    events = require('../../events'),
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
        urlCache[key] = _.cloneDeep(value);
        events.emit('url.added', key, value);
    }
};
