import type { ActivePresence, PresencePollResult, PresenceResource } from './presence-api';

/** Matches the server's active window; entries older than this are gone on the next read anyway. */
export const ACTIVE_WINDOW_MS = 60_000;

export type LivePresence = { entry: ActivePresence; expiresAt: number };

/**
 * Replace the entries for the resources this poll asked about and keep the
 * rest until they expire, so rows scrolled out of a list do not blink.
 */
export function mergeActive(
  previous: LivePresence[],
  response: PresencePollResult,
  resources: PresenceResource[],
  now: number,
): LivePresence[] {
  const requested = new Set(resources.map(({ type, id }) => `${type}:${id}`));
  const retained = previous.filter(
    ({ entry, expiresAt }) =>
      expiresAt > now && !requested.has(`${entry.resourceType}:${entry.resourceId}`),
  );
  // Server timestamps become local expiry times.
  const offset = now - response.serverTime;
  return [
    ...retained,
    ...response.active.map((entry) => ({ entry, expiresAt: entry.ts + offset + ACTIVE_WINDOW_MS })),
  ];
}
