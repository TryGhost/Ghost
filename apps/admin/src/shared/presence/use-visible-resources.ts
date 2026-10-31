import { useEffect, useState, type RefObject } from 'react';
import type { PresenceResource } from './presence-api';

/** The server accepts this many resources per poll. */
export const MAX_RESOURCES = 50;

const ROW_SELECTOR = '[data-presence-id]';

function rowsIn(node: Node): Element[] {
  if (!(node instanceof Element)) {
    return [];
  }
  return [...(node.matches(ROW_SELECTOR) ? [node] : []), ...node.querySelectorAll(ROW_SELECTOR)];
}

/**
 * The resources whose `[data-presence-id]` rows are on screen, for one poll
 * request. Rows are watched as they mount and unmount, since a list renders
 * its rows a frame after the screen and pages more in as it scrolls.
 */
export function useVisibleResources(
  root: RefObject<HTMLElement | null>,
  resources: PresenceResource[],
  enabled: boolean,
): PresenceResource[] {
  const key = JSON.stringify(resources);
  const [visible, setVisible] = useState<PresenceResource[]>([]);
  useEffect(() => {
    const container = root.current;
    if (!enabled || !container) {
      return;
    }
    const byId = new Map(resources.map((resource) => [resource.id, resource]));
    const ids = new Set<string>();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const publish = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        setVisible(
          [...ids]
            .sort()
            .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
            .slice(0, MAX_RESOURCES),
        );
      }, 250);
    };
    const intersections = new IntersectionObserver((entries) => {
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
      publish();
    });
    container.querySelectorAll(ROW_SELECTOR).forEach((element) => intersections.observe(element));
    const mutations = new MutationObserver((records) => {
      let removed = false;
      for (const record of records) {
        record.addedNodes.forEach((node) =>
          rowsIn(node).forEach((element) => intersections.observe(element)),
        );
        record.removedNodes.forEach((node) =>
          rowsIn(node).forEach((element) => {
            intersections.unobserve(element);
            const id = element.getAttribute('data-presence-id');
            if (id && ids.delete(id)) {
              removed = true;
            }
          }),
        );
      }
      if (removed) {
        publish();
      }
    });
    mutations.observe(container, { childList: true, subtree: true });
    return () => {
      intersections.disconnect();
      mutations.disconnect();
      clearTimeout(debounce);
    };
    // The observers are rebuilt only when the rows change.
  }, [root, key, enabled]);
  return enabled
    ? visible.filter((resource) => resources.some((current) => current.id === resource.id))
    : [];
}
