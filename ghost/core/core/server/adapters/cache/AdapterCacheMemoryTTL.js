const { LRUCache } = require('lru-cache');
const { CacheBase } = require('@tryghost/adapter-base-cache');
const { roughSize } = require('./rough-size');
const { createCopier, UNCOPYABLE } = require('./copy-on-access');

/**
 * Bound used when a configuration names neither `max` nor `maxSize`. The
 * adapter used to default to no bound at all, which is not a cache so much as a
 * leak: nothing evicts, and a cache keyed per member holds a response per
 * member per query for the life of the process.
 */
const DEFAULT_MAX_ITEMS = 10000;

/**
 * In-memory cache adapter.
 *
 * Backed by `lru-cache` rather than `@isaacs/ttlcache`, which its own README
 * describes as "the time-based use-recency-unaware cousin of lru-cache". Two of
 * the differences matter for a response cache:
 *
 * - **Eviction order.** ttlcache purges "the soonest-expiring items first", and
 *   a cache configured with one TTL for the whole feature gives every entry the
 *   same lifetime, so soonest-expiring is oldest-inserted and eviction is
 *   effectively FIFO. Traffic to a publication is not uniform - a few posts take
 *   most of the views - so FIFO drops the hot entries and keeps whatever was
 *   written last. LRU keeps the working set, which is the whole point of a cache
 *   under a skewed distribution.
 * - **Bounding.** ttlcache does not support size calculation: "Max capacity is
 *   simply the count of items in the cache". Entries here are API responses
 *   carrying rendered HTML, so a count is a poor proxy for memory. `maxSize`
 *   bounds the bytes.
 *
 * Distinct features of this cache adapter:
 * - it is in-memory only
 * - it supports time-to-live (TTL)
 * - it supports a max number of items, a max approximate size, or both
 * - it can hand out private copies, so a caller that mutates what it was given
 *   cannot corrupt the cache (see copy-on-access.js)
 */
class AdapterCacheMemoryTTL extends CacheBase {
  #cache;

  /** @type {(value: unknown) => unknown} */
  #copy;

  /**
   * @param {Object} [deps]
   * @param {number} [deps.max] - The max number of items to keep in the cache.
   * @param {number} [deps.ttl] - The max time in ms to store items
   * @param {number} [deps.maxSize] - Approximate bytes the cache may hold. Sizes
   *   are estimated (see rough-size.js), so treat this as a budget rather than a
   *   guarantee.
   * @param {(value: unknown, key: string) => number} [deps.sizeCalculation] -
   *   Override the estimator. Only settable in code; config carries numbers.
   * @param {boolean} [deps.clone] - Hand out a private copy on every read and
   *   write. Off by default; see copy-on-access.js.
   */
  constructor({ max, ttl, maxSize, sizeCalculation, clone = false } = {}) {
    super();

    const options = {};

    // lru-cache requires a real bound - Infinity is not one - and rejects
    // options it was not given a use for, so each is passed only when set.
    if (Number.isFinite(ttl) && ttl > 0) {
      options.ttl = ttl;
    }

    if (Number.isFinite(max) && max > 0) {
      options.max = max;
    }

    if (Number.isFinite(maxSize) && maxSize > 0) {
      options.maxSize = maxSize;
      options.sizeCalculation = sizeCalculation || ((value) => roughSize(value));
    }

    if (!options.max && !options.maxSize) {
      options.max = DEFAULT_MAX_ITEMS;
    }

    this.#cache = new LRUCache(options);
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

    // lru-cache rejects an explicit `undefined` ttl when no default TTL is
    // configured, so only pass one through when the caller gave it.
    this.#cache.set(key, stored, ttl === undefined ? undefined : { ttl });
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
