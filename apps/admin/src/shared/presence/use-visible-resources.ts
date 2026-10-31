import { useEffect, useState, type RefObject } from 'react';
import type { PresenceResource } from './presence-api';

/** The server accepts this many resources per poll. */
export const MAX_RESOURCES = 50;

/** The resources whose `[data-presence-id]` rows are on screen, for one poll request. */
export function useVisibleResources(
  root: RefObject<HTMLElement | null>,
  resources: PresenceResource[],
  enabled: boolean,
): PresenceResource[] {
  const key = JSON.stringify(resources);
  const [visible, setVisible] = useState<PresenceResource[]>([]);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const byId = new Map(resources.map((resource) => [resource.id, resource]));
    const ids = new Set<string>();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute('data-presence-id');
        if (id) {
          if (entry.isIntersecting) {
            ids.add(id);
          } else {
            ids.delete(id);
          }
        }
      }
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        setVisible(
          [...ids]
            .sort()
            .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
            .slice(0, MAX_RESOURCES),
        );
      }, 250);
    });
    root.current
      ?.querySelectorAll('[data-presence-id]')
      .forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      clearTimeout(debounce);
    };
    // The observer is rebuilt only when the rows change.
  }, [root, key, enabled]);
  return enabled
    ? visible.filter((resource) => resources.some((current) => current.id === resource.id))
    : [];
}
