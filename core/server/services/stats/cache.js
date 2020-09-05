const _ = require('lodash');

/**
 * ## Cache
 * Holds cached stats
 */
let statsCache = {};

module.exports = {
    get(key) {
        return statsCache[key];
    },

    set(key, value) {
        statsCache[key] = _.cloneDeep(value);
    },

    getAll() {
        return _.cloneDeep(statsCache);
    },

    init(stats) {
        statsCache = stats;
    },

    reset() {
        statsCache = {};
    }
};
