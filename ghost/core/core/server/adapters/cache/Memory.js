const Base = require('./Base');

class MemoryCache extends Base {
    constructor() {
        super();

        this._data = {};
    }

    get(key) {
        return this._data[key];
    }

    /**
     *
     * @param {String} key
     * @param {*} value
     */
    set(key, value) {
        this._data[key] = value;
    }

    reset() {
        this._data = {};
    }

    /**
     * Helper method to assist "getAll" type of operations
     * @returns {Array<String>} all keys present in the cache
     */
    keys() {
        return Object.keys(this._data);
    }
}

module.exports = MemoryCache;
