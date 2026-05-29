const crypto = require('crypto');
const {z} = require('zod');

/**
 * Deterministic bucket in the range [0, 99] for a (flag, siteId) pair.
 *
 * The flag name is part of the hash input so that ramps are decorrelated across
 * flags: a site that lands in the enabled bucket for one flag is not biased
 * towards being enabled for another. Because the same input always produces the
 * same bucket, raising a flag's percent only ever adds sites (monotonic ramp).
 *
 * md5 is used purely as a fast, uniform, stable bucketing hash, not for any
 * security property. `% 100` carries a negligible modulo bias (the 2^32 hash
 * space is not a multiple of 100, so buckets 0-95 are over-represented by ~1 part
 * in 43 million), which is immaterial at fleet scale. The mapping must stay
 * stable: changing the algorithm, byte offset, or separator would silently
 * re-bucket every in-flight ramp, so a golden value is pinned in the tests.
 *
 * @param {string} flag
 * @param {number|string} siteId
 * @returns {number} integer in [0, 99]
 */
function bucketFor(flag, siteId) {
    const digest = crypto.createHash('md5').update(`${flag}:${siteId}`).digest();
    return digest.readUInt32BE(0) % 100;
}

/**
 * The shape of a single manifest entry: either a bare boolean (a full override) or
 * a `{value, percent?}` ramp. Validation is delegated to Zod so the contract is
 * declarative; note that `z.number()` rejects NaN/Infinity, so a non-finite or
 * non-numeric percent is treated as a malformed entry and skipped (such values
 * cannot occur in valid JSON anyway). Unknown keys inside a ramp object are stripped.
 */
const entrySchema = z.union([
    z.boolean(),
    z.object({
        value: z.boolean(),
        percent: z.number().optional()
    })
]);

/**
 * Resolve a sparse remote manifest into a flat `{flag: boolean}` override map for
 * a single site.
 *
 * The manifest is sparse: an absent flag means "no opinion" (fall through to the
 * normal labs precedence), not "off". Each present entry is either:
 *   - a bare boolean: a full override applied to every site, or
 *   - `{value: boolean, percent?: number}`: a ramp. With no percent (or percent
 *     >= 100) it is a full override; otherwise the override applies only to sites
 *     whose deterministic bucket falls below `percent`.
 *
 * Only keys present in `knownFlags` are honored, and each entry is validated and
 * skipped individually (per-entry skip): one bad entry can never discard the rest
 * of the manifest, and the manifest can never introduce a flag that core does not
 * already define. The flag allowlist is supplied by the caller (the labs service),
 * not duplicated here.
 *
 * @param {*} manifest - parsed manifest; anything that is not a plain object yields `{}`
 * @param {object} [options]
 * @param {number|string} [options.siteId] - this container's site id; required to resolve ramps
 * @param {string[]} [options.knownFlags] - the only flag keys that may be overridden
 * @returns {Object<string, boolean>} resolved overrides for this site
 */
function resolve(manifest, options) {
    const result = {};

    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
        return result;
    }

    // Normalise options defensively: this function must never throw on bad input,
    // so a null/omitted options object or a non-array knownFlags is tolerated.
    const {siteId, knownFlags} = options || {};
    const known = new Set(Array.isArray(knownFlags) ? knownFlags : []);

    for (const flag of Object.keys(manifest)) {
        if (!known.has(flag)) {
            // Unknown flag: never let the manifest invent a flag core doesn't define.
            continue;
        }

        const parsed = entrySchema.safeParse(manifest[flag]);
        if (!parsed.success) {
            // Malformed entry: skip it individually, keeping every valid sibling.
            continue;
        }
        const entry = parsed.data;

        // Bare boolean: full override for every site.
        if (typeof entry === 'boolean') {
            result[flag] = entry;
            continue;
        }

        // Ramp object. A missing percent is a full override; clamp so a typo can
        // never widen beyond the whole fleet or go negative.
        let percent = entry.percent === undefined ? 100 : entry.percent;
        percent = Math.max(0, Math.min(100, percent));

        if (percent <= 0) {
            // 0% is "no opinion" for this site.
            continue;
        }
        if (percent >= 100) {
            result[flag] = entry.value;
            continue;
        }

        // A ramp needs a stable, scalar site id to bucket against. Without a
        // usable id (a non-Pro container with no siteId, or an unexpected
        // non-scalar/empty value) we cannot place the site, so we skip the ramp
        // while still having applied any full overrides above. Guarding the type
        // here also means a hostile siteId can never make bucketFor throw.
        const canBucket = (typeof siteId === 'number' && Number.isFinite(siteId))
            || (typeof siteId === 'string' && siteId !== '');
        if (!canBucket) {
            continue;
        }

        if (bucketFor(flag, siteId) < percent) {
            result[flag] = entry.value;
        }
    }

    return result;
}

module.exports = resolve;
module.exports.bucketFor = bucketFor;
