const TTLCache = require('@isaacs/ttlcache');
const { CacheBase } = require('@tryghost/adapter-base-cache');
const { createCopier, UNCOPYABLE } = require('./copy-on-access');

/**
 * Cache adapter compatible wrapper around TTLCache
 * Distinct features of this cache adapter:
 * - it is in-memory only
 * - it supports time-to-live (TTL)
 * - it supports a max number of items
 */
class AdapterCacheMemoryTTL extends CacheBase {
  #cache;

  /** @type {(value: unknown) => unknown} */
  #copy;

  /**
   *
   * @param {Object} [deps]
   * @param {number} [deps.max] - The max number of items to keep in the cache.
   * @param {number} [deps.ttl] - The max time in ms to store items
   * @param {boolean} [deps.clone] - Hand out a private copy on every read and
   *   write, so a caller that mutates what it was given cannot corrupt the
   *   cache. Off by default; see copy-on-access.js.
   */
  constructor({ max = Infinity, ttl = Infinity, clone = false } = {}) {
    super();

    this.#cache = new TTLCache({ max, ttl });
    this.#copy = createCopier(clone);
  }

  get(key) {
    const value = this.#copy(this.#cache.get(key));

    return value === UNCOPYABLE ? undefined : value;
  }

  /**
   *
   * @param {string} key
   * @param {*} value
   * @param {Object} [options]
   * @param {number} [options.ttl]
   */
  set(key, value, { ttl } = {}) {
    const stored = this.#copy(value);

    // Uncopyable: leave the key alone rather than storing something a later
    // read cannot safely hand out.
    if (stored === UNCOPYABLE) {
      return;
    }

    this.#cache.set(key, stored, { ttl });
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
