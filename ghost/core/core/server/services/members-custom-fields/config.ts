import {z} from 'zod';

/**
 * Resolving Ghost's config into the values this service runs on.
 *
 * Config arrives untyped: defaults.json supplies the shipped value, and any
 * higher layer — an operator's config file, an environment variable, argv — can
 * replace it with anything at all. Turning that into something usable is a
 * config concern, so it happens here, at the boundary. The service is handed an
 * answer and never learns where it came from.
 */

// A ceiling in the form the service needs it. A numeric string is accepted
// because a value supplied through an environment variable can arrive as one.
const Ceiling = z
    .union([z.number(), z.string().trim().min(1)])
    .transform(Number)
    .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));

// defaults.json is the single source of the shipped ceiling: it is the lowest
// config layer and the file an operator actually reads and edits, so it is read
// rather than restated. Parsed eagerly because a missing or malformed value
// there is our bug rather than an operator's, and should fail loudly at boot
// instead of quietly becoming the fallback for everything below.
const shippedCeiling: number = Ceiling.parse(
    require('../../../shared/config/defaults.json').members.customFields.maxDefinitions
);

// A higher layer can override the shipped value with anything. Something
// unreadable falls back to the shipped ceiling rather than throwing, because an
// operator can correct this live and a bad value must not take the feature down
// with it — and rather than meaning "no ceiling", because a typo must not
// silently remove the safeguard.
const MaxDefinitions = Ceiling.catch(shippedCeiling);

export function resolveMaxDefinitions(configured: unknown): number {
    return MaxDefinitions.parse(configured);
}
