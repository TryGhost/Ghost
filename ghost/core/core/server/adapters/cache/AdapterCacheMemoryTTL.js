const TTLCache = require('@isaacs/ttlcache');
const Base = require('@tryghost/adapter-base-cache');

/**
 * Cache adapter compatible wrapper around TTLCache
 * Distinct features of this cache adapter:
 * - it is in-memory only
 * - it supports time-to-live (TTL)
 * - it supports a max number of items
 */
class AdapterCacheMemoryTTL extends Base {
    #cache;

    /**
     *
     * @param {Object} [deps]
     * @param {Number} [deps.max] - The max number of items to keep in the cache.
     * @param {Number} [deps.ttl] - The max time in ms to store items
     */
    constructor({max = Infinity, ttl = Infinity} = {}) {
        super();

        this.#cache = new TTLCache({max, ttl});
    }

    get(key) {
        return this.#cache.get(key);
    }

    /**
     *
     * @param {String} key
     * @param {*} value
     * @param {Object} [options]
     * @param {Number} [options.ttl]
    */
    set(key, value, {ttl} = {}) {
        this.#cache.set(key, value, {ttl});
    }

    reset() {
        this.#cache.clear();
    }

    /**
     * Helper method to assist "getAll" type of operations
     * @returns {Array<String>} all keys present in the cache
     */
    keys() {
        return [...this.#cache.keys()];
    }
}

module.exports = AdapterCacheMemoryTTL;
