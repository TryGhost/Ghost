/**
 * Stats
 * A collection of utilities for handling stats of the site
 */
const init = require('./init');
const cache = require('./cache');

module.exports = {
    init,

    get(key) {
        return cache.get(key);
    },

    getAll() {
        return cache.getAll();
    }
};
