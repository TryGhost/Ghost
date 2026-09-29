import { useEffect, useState, type RefObject } from 'react';
import type { PresenceResource } from './use-presence';

/** Collect visible rows for a single poll request. */
export function useVisibleResources(
  root: RefObject<HTMLElement | null>,
  resources: PresenceResource[],
  enabled: boolean,
) {
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
            .slice(0, 50),
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
    // Recreate the observer only when the resources change.
  }, [root, key, enabled]);
  return enabled
    ? visible.filter((resource) => resources.some((current) => current.id === resource.id))
    : [];
}
