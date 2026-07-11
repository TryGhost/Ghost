import crypto from 'crypto';
import {z} from 'zod';

export interface ResolveOptions {
    /** this site's UUID; required to resolve ramps */
    siteUuid?: string;
}

// Skip keys that would shadow an Object.prototype member: a manifest
// `{"toString": true}` would make `labs.toString` a boolean and break any caller.
// Deriving from Object.prototype covers __proto__, constructor, toString, etc.
const UNSAFE_KEYS = new Set([...Object.getOwnPropertyNames(Object.prototype), 'prototype']);

/**
 * Deterministic bucket in [0, 99] for a (flag, siteUuid) pair.
 *
 * The flag name is in the hash so ramps are decorrelated across flags, and the
 * mapping is stable so raising a flag's percent only ever adds sites (monotonic).
 * Bucketing on the universally-available site UUID keeps ramps available to any
 * site. md5 is just a fast, uniform hash here, not a security primitive. The
 * mapping must stay stable: changing the algorithm, offset, or separator silently
 * re-buckets every in-flight ramp, so a golden value is pinned in the tests.
 */
export function bucketFor(flag: string, siteUuid: string): number {
    const digest = crypto.createHash('md5').update(`${flag}:${siteUuid}`).digest();
    return digest.readUInt32BE(0) % 100;
}

/**
 * A manifest entry: a bare boolean (full override) or a `{value, percent?}` ramp.
 * `z.number()` rejects NaN/Infinity, so a non-finite percent is treated as
 * malformed and skipped. Unknown keys inside a ramp object are stripped.
 */
const entrySchema = z.union([
    z.boolean(),
    z.object({
        value: z.boolean(),
        percent: z.number().optional()
    })
]);

/**
 * Resolve a sparse remote manifest into a flat `{flag: boolean}` override map for one
 * site. An absent flag means "no opinion" (falls through to normal labs precedence),
 * not "off". Each entry is a bare boolean (applies to every site) or a
 * `{value, percent?}` ramp (applies only to sites whose bucket is below `percent`; a
 * missing or >=100 percent is a full override).
 *
 * Any flag key is honored, not only those the backend defines: the frontend and
 * backend ship on different cadences, so the manifest can carry a flag the backend
 * does not know about yet.
 *
 * @param manifest - parsed manifest; anything that is not a plain object yields `{}`
 */
export function resolve(manifest: unknown, options?: ResolveOptions): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
        return result;
    }

    const {siteUuid} = options || {};

    const entries = manifest as Record<string, unknown>;
    for (const flag of Object.keys(entries)) {
        if (UNSAFE_KEYS.has(flag)) {
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

        // Clamp so a typo can't widen beyond the fleet or go negative.
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

        // Ramps need a usable site UUID to bucket against; without one, skip the
        // ramp (any full overrides above still applied). Also guards bucketFor input.
        if (typeof siteUuid !== 'string' || siteUuid === '') {
            continue;
        }

        if (bucketFor(flag, siteUuid) < percent) {
            result[flag] = entry.value;
        }
    }

    return result;
}
