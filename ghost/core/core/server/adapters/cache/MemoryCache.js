const { CacheBase } = require('@tryghost/adapter-base-cache');
const { createCopier, UNCOPYABLE } = require('./copy-on-access');

class MemoryCache extends CacheBase {
  /** @type {(value: unknown) => unknown} */
  #copy;

  /**
   * @param {Object} [config]
   * @param {boolean} [config.clone] hand out a private copy on every read and
   *   write, so a caller that mutates what it was given cannot corrupt the
   *   cache. Off by default: this adapter also backs caches whose callers do
   *   not mutate, and copying those would only cost. See copy-on-access.js.
   */
  constructor({ clone = false } = {}) {
    super();

    this._data = {};
    this.#copy = createCopier(clone);
  }

  get(key) {
    const value = this.#copy(this._data[key]);

    return value === UNCOPYABLE ? undefined : value;
  }

  /**
   *
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const stored = this.#copy(value);

    // Uncopyable: leave the key alone rather than storing something a later
    // read cannot safely hand out.
    if (stored === UNCOPYABLE) {
      return;
    }

    this._data[key] = stored;
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
