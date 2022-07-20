/**
 * Store themes after loading them from the file system
 */
const _ = require('lodash');

let themeListCache = {};

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
        const self = this;
        // First, reset the cache
        themeListCache = {};
        // For each theme, call set. Allows us to do processing on set later.
        _.each(themes, function (theme, key) {
            self.set(key, theme);
        });

        return themeListCache;
    }
};
