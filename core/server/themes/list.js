/**
 * Store themes after loading them from the file system
 */
var _ = require('lodash'),
    themeListCache = {};

module.exports = {
    get: function get(key) {
        return themeListCache[key];
    },

    getAll: function getAll() {
        return themeListCache;
    },

    set: function set(key, theme) {
        themeListCache[key] = _.cloneDeep(theme);
        return themeListCache[key];
    },

    del: function del(key) {
        delete themeListCache[key];
    },

    init: function init(themes) {
        var self = this;
        // First, reset the cache
        themeListCache = {};
        // For each theme, call set. Allows us to do processing on set later.
        _.each(themes, function (theme, key) {
            self.set(key, theme);
        });

        return themeListCache;
    }
};
