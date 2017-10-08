// Urls are paths understood by Ghost
// Things we need to know:
// route,
// resourceType (post, page, tag, author, channel, news, image, other) (array?)
// contexts?
// identifier / filter that generated it, e.g. tag = filter=tag:x
// last modified
// change frequency
// priority
//


// Based heavily on the settings cache
var _ = require('lodash'),
    events = require('../../events'),
    urlCache = {};

module.exports = {
    /**
     * Get the entire cache object
     * Uses clone to prevent modifications from being reflected
     * @return {{}} urlCache
     */
    getAll: function getAll() {
        return _.cloneDeep(urlCache);
    },
    set: function set(key, value) {
        urlCache[key] = _.cloneDeep(value);
        events.emit('url.added', key, value)
    }
};
