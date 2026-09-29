import { useMemo } from 'react';
import type { PresenceEvent } from './use-presence';

const EMPTY_EVENTS: PresenceEvent[] = [];

/** Keep each row's events stable between polls. */
export function usePresenceByResource(events: PresenceEvent[]) {
  return useMemo(() => {
    const groups = new Map<string, PresenceEvent[]>();
    for (const event of events) {
      const group = groups.get(event.resourceId) ?? [];
      group.push(event);
      groups.set(event.resourceId, group);
    }
    return (id: string) => groups.get(id) ?? EMPTY_EVENTS;
  }, [events]);
}
