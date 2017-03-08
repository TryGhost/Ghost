/**
 * Store themes after loading them from the file system
 */
var _ = require('lodash'),
    packages = require('../utils/packages'),
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
    },
    toAPI: function toAPI(themes, active) {
        var toFilter;

        if (themes.hasOwnProperty('name')) {
            toFilter = {};
            toFilter[themes.name] = themes;
        } else {
            toFilter = themes;
        }

        return packages.filterPackages(toFilter, active);
    }
};
