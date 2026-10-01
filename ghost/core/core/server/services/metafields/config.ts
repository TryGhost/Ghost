import { z } from 'zod';
import type { MetafieldEntity } from './entity';

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

const defaults: unknown = require('../../../shared/config/defaults.json');

/** Each entity's ceiling sits beside the rest of that entity's config. */
function maxDefinitionsKey(entity: MetafieldEntity): string {
  return `${entity.table}:metafields:maxDefinitions`;
}

function shippedAt(key: string): unknown {
  return key
    .split(':')
    .reduce<unknown>(
      (node, segment) =>
        typeof node === 'object' && node !== null && Object.hasOwn(node, segment)
          ? (node as Record<string, unknown>)[segment]
          : undefined,
      defaults,
    );
}

/**
 * The ceiling on how many definitions an entity's records may carry, as a getter: the
 * ceiling is an operator setting that can change between requests, and a Ghost container
 * holds no state across them.
 *
 * defaults.json is the single source of the shipped ceiling: it is the lowest config
 * layer and the file an operator actually reads and edits, so it is read rather than
 * restated. Read when the entity is wired, at boot, because a missing or malformed value
 * there is our bug rather than an operator's and should fail loudly instead of quietly
 * becoming the fallback for everything above it.
 *
 * A higher layer can override the shipped value with anything. Something unreadable
 * falls back to the shipped ceiling rather than throwing, because an operator can correct
 * this live and a bad value must not take the feature down with it — and rather than
 * meaning "no ceiling", because a typo must not silently remove the safeguard.
 */
export function maxDefinitionsFor(
  entity: MetafieldEntity,
  config: { get(key: string): unknown },
): () => number {
  const key = maxDefinitionsKey(entity);
  const MaxDefinitions = Ceiling.catch(Ceiling.parse(shippedAt(key)));
  return () => MaxDefinitions.parse(config.get(key));
}
