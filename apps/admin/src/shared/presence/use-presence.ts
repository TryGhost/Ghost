import { useEffect, useRef, useState } from 'react';
import { dequal } from 'dequal';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { usePresenceApi } from '@tryghost/admin-x-framework/api/presence';
import { startActivityPoller } from './activity-poller';
import { mergeActive, type LivePresence } from './merge-active';
import { parsePresenceResponse, type ActivePresence, type PresenceResource } from './presence-api';

const EMPTY: ActivePresence[] = [];

/** The Labs flag; an older backend without the endpoint answers 404 and polling stops. */
export function usePresenceEnabled(): boolean {
  return useFeatureFlag('editorPresencePolling');
}

/**
 * Poll presence for `resources` while the tab is visible and, when `editing`
 * is set, record this user on that resource with every poll. Returns other
 * users active on the requested resources; the server never returns the caller.
 */
export function usePresence(
  resources: PresenceResource[],
  editing?: PresenceResource,
): { active: ActivePresence[] } {
  const enabled = usePresenceEnabled();
  const api = usePresenceApi();
  const [active, setActive] = useState<ActivePresence[]>(EMPTY);
  const resourceKey = JSON.stringify(resources);
  const editingId = editing?.id;
  const editingType = editing?.type;
  const resourcesRef = useRef(resources);
  resourcesRef.current = resources;
  const startRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const current = editingId && editingType ? { id: editingId, type: editingType } : undefined;
    let expire: ReturnType<typeof setTimeout> | undefined;
    let live: LivePresence[] = [];
    const update = (next: ActivePresence[]) =>
      setActive((previous) => (dequal(previous, next) ? previous : next));
    const clear = () => {
      clearTimeout(expire);
      live = [];
      update(EMPTY);
    };
    const refresh = () => {
      clearTimeout(expire);
      live = live.filter(({ expiresAt }) => expiresAt > Date.now());
      update(live.map(({ entry }) => entry));
      if (live.length > 0) {
        expire = setTimeout(
          refresh,
          Math.max(1, Math.min(...live.map(({ expiresAt }) => expiresAt - Date.now()))),
        );
      }
    };
    let stop: (() => void) | undefined;
    const start = () => {
      if (stop || resourcesRef.current.length === 0) {
        return;
      }
      stop = startActivityPoller({
        onPause(reason) {
          clear();
          if (current && reason !== 'unsupported') {
            api.leave(current);
          }
        },
        async poll(isCurrent) {
          const window = resourcesRef.current;
          if (window.length === 0) {
            return undefined;
          }
          try {
            const response = parsePresenceResponse(await api.poll(window, current));
            if (isCurrent()) {
              live = mergeActive(live, response, window, Date.now());
              refresh();
            }
            return true;
          } catch (error) {
            if (
              error instanceof APIError &&
              [401, 403, 404].includes(error.response?.status ?? 0)
            ) {
              return false;
            }
            if (isCurrent()) {
              clear();
            }
            throw error;
          }
        },
      });
    };
    startRef.current = start;
    start();
    return () => {
      startRef.current = undefined;
      stop?.();
      clearTimeout(expire);
    };
  }, [enabled, api, editingId, editingType]);

  // Rows can appear after mount; scrolling must not restart a running poller.
  useEffect(() => {
    startRef.current?.();
  }, [resourceKey]);

  return { active: enabled ? active : EMPTY };
}
