import type { PresenceEvent, PresenceResource } from './use-presence';

const FRESHNESS_MS = 30000;
export type LiveEvent = { event: PresenceEvent; expiresAt: number };

export function mergeLiveEvents(
  previous: LiveEvent[],
  response: { events: PresenceEvent[]; serverTime: number },
  resources: PresenceResource[],
  currentUserId: string | undefined,
  now: number,
): LiveEvent[] {
  const requested = new Set(resources.map(({ type, id }) => `${type}:${id}`));
  // Keep fresh avatars for rows outside this poll without extending their expiry.
  const retained = previous.filter(
    ({ event, expiresAt }) =>
      expiresAt > now && !requested.has(`${event.resourceType}:${event.resourceId}`),
  );
  const fresh = response.events.filter(
    (event) =>
      (event.action === 'opened' || event.action === 'editing') &&
      event.userId !== currentUserId &&
      event.ts > response.serverTime - FRESHNESS_MS,
  );
  // Convert server timestamps to local expiry times.
  const offset = now - response.serverTime;
  return [
    ...retained,
    ...fresh.map((event) => ({ event, expiresAt: event.ts + offset + FRESHNESS_MS })),
  ];
}
