/**
 * The scheme each origin (host and port) served media over during one import
 * run: 'https' once https has answered, 'http' once https was unreachable.
 */
export type OriginSchemes = Map<string, 'https' | 'http'>;

/**
 * Creates the record for one import run, so files from the same origin skip a
 * known-dead https attempt and never fall back to http on a connection failure
 * once https has answered.
 * Each run makes its own: what one run learns doesn't carry over to the next.
 * An import touches few origins, so the record needs no bound.
 */
export function createOriginSchemes(): OriginSchemes {
  return new Map();
}
