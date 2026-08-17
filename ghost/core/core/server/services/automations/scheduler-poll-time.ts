const SCHEDULER_POLL_INTERVAL_MS = 15 * 60 * 1000;

/**
 * An implementation of the [FNV-1a hash][0].
 *
 * We need something that generates per-site jitter within a 15-minute
 * interval. We want a 32-bit number which we can modulo at the end.
 *
 * FNV-1a is good for this purpose because:
 *
 * - it is simple
 * - it generates a 32-bit number
 * - it is [more efficient than CRC32, MD5, and SHA][1], using less CPU and RAM
 *
 * This implementation assumes ASCII strings, which we expect callers to always
 * use. If that assumption is ever violated, we'll compute incorrect jitter,
 * which is acceptable.
 *
 * [0]: https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function#FNV-1a_hash
 * [1]: https://gist.github.com/EvanHahn/20d845c8157691d24977831159487950
 */
const fnv1a32 = (asciiStr: string): number => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < asciiStr.length; i++) {
        hash ^= asciiStr.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
};

/**
 * Round the time up to a 15-minute interval with site-specific jitter.
 */
export const getSchedulerPollTime = (date: Readonly<Date>, siteIdentifier: string): Date => {
    const siteOffset = fnv1a32(siteIdentifier) % SCHEDULER_POLL_INTERVAL_MS;
    const interval = Math.ceil((date.getTime() - siteOffset) / SCHEDULER_POLL_INTERVAL_MS);
    return new Date(interval * SCHEDULER_POLL_INTERVAL_MS + siteOffset);
}
