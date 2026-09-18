/**
 * A cheap, approximate byte size for a cached value.
 *
 * Bounding an in-process cache by entry count is not much of a bound when the
 * entries are API responses: a page of posts carries their rendered HTML, so
 * one entry can be a few hundred bytes or a megabyte and `max` cannot tell the
 * difference. `maxSize` needs a size for every entry, and the obvious way to
 * get one - `JSON.stringify(value).length` - costs about as much as the
 * serialisation an in-process cache exists to avoid (~1.2 ms on a 290 KiB
 * response). So this walks the structure instead and adds up what it finds,
 * allocating nothing.
 *
 * It is an estimate, and only has to be a consistent one: what matters for a
 * limit is that a response twice the size counts about twice as much, not that
 * the number matches the heap exactly. Strings dominate these payloads and are
 * counted at V8's two bytes per character, so for the mostly-ASCII JSON these
 * caches hold the estimate lands around twice the serialised byte count - on a
 * 274 KiB response it reported 554 KiB. Budget for that when choosing
 * `maxSize`: it errs toward evicting sooner, which is the safe direction for a
 * bound whose job is to stop a process running out of memory.
 *
 * Measured at 0.039 ms for that 274 KiB response, against 0.883 ms to
 * `JSON.stringify` it - about a third of what cloning the same value costs, so
 * it does not meaningfully change the price of a cache write.
 */

// V8 object header plus a pointer slot, near enough for the per-value overhead
// that makes an empty object cost more than nothing.
const VALUE_OVERHEAD = 16;
const POINTER = 8;

/**
 * @param {unknown} value
 * @returns {number} approximate bytes, always at least 1
 */
function roughSize(value) {
  // Cycles do not occur in an API response, but a cache is generic and an
  // unbounded walk would be a denial of service rather than a wrong number.
  const seen = new Set();

  function walk(node) {
    if (node === null || node === undefined) {
      return POINTER;
    }

    switch (typeof node) {
      case 'string':
        return VALUE_OVERHEAD + node.length * 2;
      case 'number':
      case 'boolean':
        return POINTER;
      case 'bigint':
        return VALUE_OVERHEAD + 8;
      case 'function':
      case 'symbol':
        return POINTER;
      default:
        break;
    }

    if (seen.has(node)) {
      return POINTER;
    }
    seen.add(node);

    if (Buffer.isBuffer(node)) {
      return VALUE_OVERHEAD + node.length;
    }

    if (node instanceof Date) {
      return VALUE_OVERHEAD + POINTER;
    }

    if (Array.isArray(node)) {
      let total = VALUE_OVERHEAD;
      for (const item of node) {
        total += POINTER + walk(item);
      }
      return total;
    }

    let total = VALUE_OVERHEAD;
    for (const key of Object.keys(node)) {
      // The key is a string in the heap too, and for a wide row of short
      // values the keys are a real share of the entry.
      total += VALUE_OVERHEAD + key.length * 2 + walk(node[key]);
    }
    return total;
  }

  // lru-cache rejects a size of 0, and every value occupies something.
  return Math.max(1, walk(value));
}

module.exports = { roughSize };
