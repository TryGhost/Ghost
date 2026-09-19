const logging = require('@tryghost/logging');

/**
 * Copy-on-access for the in-process cache adapters.
 *
 * The API framework's cache stage stores whatever the pipeline produced and
 * hands the same value straight back on a hit (see
 * `packages/api-framework/lib/pipeline.js`). A cache adapter that returns its
 * stored object by reference therefore shares one object with every caller —
 * and callers mutate it. `prepareContextResource` in the frontend rewrites
 * `feature_image_caption` and deletes `show_title_and_feature_image` from the
 * resource it is handed, so a page whose title and feature image are turned off
 * renders correctly once and wrongly on every cached request afterwards.
 *
 * The Redis adapter never had this problem, because its JSON round trip is
 * incidentally also a deep copy. That copy is not free: at a realistic browse
 * payload (~290 KiB) `JSON.parse(JSON.stringify(x))` measured ~1.17 ms against
 * ~0.15 ms for `structuredClone`, because these responses are mostly long
 * strings and cloning shares immutable strings rather than re-parsing them.
 *
 * So the in-process adapters can have the same copy semantics far more cheaply
 * — but only where they are wanted. `MemoryCache` is the default `active`
 * adapter and so also backs `cache:settings`, which is read constantly and
 * whose callers do not mutate it; copying that on every read would be a plain
 * regression. Hence opt-in, per feature:
 *
 *     adapters.cache.postsPublic = {adapter: 'memory-ttl', ttl, max, clone: true}
 */

/**
 * Returned in place of a value that cannot be copied, so callers can tell
 * "no copy" apart from a legitimately cached `undefined`.
 */
const UNCOPYABLE = Symbol('uncopyable');

/**
 * Build the copy function for a cache adapter.
 *
 * @param {boolean} [enabled] copy on every read and write
 * @returns {(value: unknown) => unknown} identity when disabled
 */
function createCopier(enabled) {
  if (!enabled) {
    return (value) => value;
  }

  let warned = false;

  return (value) => {
    // Nothing to share, and `undefined` is also how a miss reads.
    if (value === undefined || value === null) {
      return value;
    }

    try {
      return structuredClone(value);
    } catch (err) {
      // structuredClone rejects a value carrying a function, where
      // JSON.stringify - and so the Redis adapter - drops it silently. Refusing
      // to cache is the conservative reading: a value that caches fine on Redis
      // must not become a 500 here, it just does not get cached. Warned once,
      // because a value that fails once fails on every request.
      if (!warned) {
        warned = true;
        logging.warn(`Cache value could not be copied and will not be cached: ${err.message}`);
      }

      return UNCOPYABLE;
    }
  };
}

module.exports = {
  createCopier,
  UNCOPYABLE,
};
