import { z } from "zod";

/**
 * Schema primitives for reusable data type transformations.
 * These are building blocks that can be composed into domain-specific schemas.
 */

/**
 * Codec for ISO 8601 datetime strings with flexible precision and timezone support.
 *
 * Ghost's Content API returns dates via moment-timezone's `toISOString(true)`, which preserves
 * timezone offset instead of normalizing to UTC. Different Ghost instances may return different
 * offsets based on their timezone configuration.
 *
 * Uses `z.iso.datetime({ offset: true })` which is **permissive by default**:
 * - Accepts arbitrary sub-second precision (no precision, seconds, milliseconds, etc.)
 * - Accepts timezone offsets when `offset: true` is set
 * - No `precision` parameter means it accepts all precision levels
 *
 * **Accepted formats:**
 * - `2025-10-22T15:30:59.000+00:00` (milliseconds + offset)
 * - `2025-10-22T15:30:59+00:00` (seconds + offset)
 * - `2025-10-22T15:30+00:00` (minutes + offset)
 * - `2025-10-22T15:30:59.000Z` (milliseconds + UTC)
 * - `2025-10-22T15:30:59Z` (seconds + UTC)
 * - Any timezone offset (e.g., `-05:00`, `+05:30`)
 *
 * **Encoding:**
 * Always encodes to standard UTC format: `2025-10-22T15:30:59.000Z`
 *
 * This permissive decoding + consistent encoding approach handles dates from multiple sources
 * (Ghost API, external APIs, user input) while maintaining predictable output.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   publishedAt: isoDatetimeToDate,
 * });
 *
 * // All formats accepted
 * schema.parse({ publishedAt: "2025-10-22T15:30:59.000+00:00" });
 * schema.parse({ publishedAt: "2025-10-22T15:30:59Z" });
 * schema.parse({ publishedAt: "2025-10-22T15:30+00:00" });
 * ```
 */
export const isoDatetimeToDate = z.codec(
    z.iso.datetime({ offset: true }),
    z.date(),
    {
        decode: (isoString) => new Date(isoString),
        encode: (date) => date.toISOString(),
    }
);
