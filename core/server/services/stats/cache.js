const _ = require('lodash');

const cache = {};

module.exports = {
    get(key) {
        const value = cache[key];

        return typeof value === 'function' ? value() : value;
    },

    getAll() {
        return _.clone(cache);
    },

    set(key, value) {
        cache[key] = value;
    }
};
