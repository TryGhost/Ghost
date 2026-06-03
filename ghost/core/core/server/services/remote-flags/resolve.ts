import crypto from 'crypto';
import {z} from 'zod';

export interface ResolveOptions {
    /** this container's site id; required to resolve ramps */
    siteId?: number | string;
}

// Keys that must never be written through from a parsed manifest. Entry values are
// always booleans, so these cannot pollute Object.prototype, but skipping them
// avoids shadowing built-ins like `constructor` on the resolved object.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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
 */
export function bucketFor(flag: string, siteId: number | string): number {
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
 * Any flag key is honored, not just those the backend already defines. The
 * frontend and backend ship on different cadences, so the manifest must be able to
 * carry a flag that only the frontend knows about yet and still have it flow
 * through `labs.getAll()`. The protections that remain are per-entry validation and
 * skip (one bad entry can never discard the rest), the skip of prototype-dangerous
 * keys, and the fact that values are always booleans.
 *
 * @param manifest - parsed manifest; anything that is not a plain object yields `{}`
 * @returns resolved overrides for this site
 */
export function resolve(manifest: unknown, options?: ResolveOptions): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
        return result;
    }

    // Normalise options defensively: this function must never throw on bad input,
    // so a null/omitted options object is tolerated.
    const {siteId} = options || {};

    const entries = manifest as Record<string, unknown>;
    for (const flag of Object.keys(entries)) {
        if (DANGEROUS_KEYS.has(flag)) {
            continue;
        }

        const parsed = entrySchema.safeParse(entries[flag]);
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

        if (bucketFor(flag, siteId!) < percent) {
            result[flag] = entry.value;
        }
    }

    return result;
}
