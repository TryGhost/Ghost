import { useMemo } from 'react';
import type { ActivePresence } from './presence-api';

const EMPTY: ActivePresence[] = [];

/** Group one poll result by resource so each row's value is stable between polls. */
export function usePresenceByResource(active: ActivePresence[]): (id: string) => ActivePresence[] {
  return useMemo(() => {
    const groups = new Map<string, ActivePresence[]>();
    for (const entry of active) {
      const group = groups.get(entry.resourceId) ?? [];
      group.push(entry);
      groups.set(entry.resourceId, group);
    }
    return (id: string) => groups.get(id) ?? EMPTY;
  }, [active]);
}
