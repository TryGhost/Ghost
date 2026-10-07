import { useEffect, useRef, useState } from 'react';
import { dequal } from 'dequal';
import { z } from 'zod';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag, useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { startActivityPoller } from './activity-poller';
import { mergeLiveEvents, type LiveEvent } from './live-events';

const eventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  resourceType: z.enum(['post', 'page']),
  resourceId: z.string(),
  ts: z.number().finite(),
});
const responseSchema = z.object({
  presence: z
    .array(
      z.object({
        events: z.array(eventSchema),
        serverTime: z.number().finite(),
      }),
    )
    .length(1),
});
export type PresenceEvent = z.infer<typeof eventSchema>;
export type PresenceResource = { id: string; type: 'post' | 'page' };
const EMPTY_EVENTS: PresenceEvent[] = [];
export function usePresenceEnabled(currentUserId: string | undefined) {
  const flag = useFeatureFlag('editorPresence');
  const { data: config } = useBrowseConfig();
  return flag && config?.config.editorPresence === true && Boolean(currentUserId);
}

export function usePresence(
  resources: PresenceResource[],
  currentUserId: string | undefined,
  editing?: PresenceResource,
) {
  const enabled = usePresenceEnabled(currentUserId);
  const fetchApi = useFetchApi();
  const [events, setEvents] = useState<PresenceEvent[]>(EMPTY_EVENTS);
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
    let live: LiveEvent[] = [];
    const updateEvents = (next: PresenceEvent[]) =>
      setEvents((previous) => (dequal(previous, next) ? previous : next));
    const clear = () => {
      clearTimeout(expire);
      live = [];
      updateEvents(EMPTY_EVENTS);
    };
    const refresh = () => {
      clearTimeout(expire);
      live = live.filter(({ expiresAt }) => expiresAt > Date.now());
      updateEvents(live.map(({ event }) => event));
      if (live.length > 0) {
        expire = setTimeout(
          refresh,
          Math.max(1, Math.min(...live.map(({ expiresAt }) => expiresAt - Date.now()))),
        );
      }
    };
    const options = {
      clear,
      async poll(isCurrent: () => boolean) {
        const window = resourcesRef.current;
        if (window.length === 0) {
          return;
        }
        try {
          const response = responseSchema.parse(
            await fetchApi<unknown>(apiUrl('/presence/'), {
              method: 'POST',
              retry: false,
              timeout: 5000,
              sessionExpiryRedirect: false,
              body: JSON.stringify({
                presence: [
                  {
                    resources: window,
                    ...(current ? { editing: current } : {}),
                  },
                ],
              }),
            }),
          ).presence[0];
          if (isCurrent()) {
            live = mergeLiveEvents(live, response, window, currentUserId, Date.now());
            refresh();
          }
          return true;
        } catch (error) {
          if (error instanceof APIError && [401, 403, 404].includes(error.response?.status ?? 0)) {
            return false;
          }
          throw error;
        }
      },
    };
    let stop: (() => void) | undefined;
    // Start once rows appear; scrolling must not restart the timer.
    const start = () => {
      if (!stop && resourcesRef.current.length > 0) {
        stop = startActivityPoller(options);
      }
    };
    startRef.current = start;
    start();
    return () => {
      startRef.current = undefined;
      stop?.();
      clearTimeout(expire);
    };
  }, [enabled, fetchApi, editingId, editingType, currentUserId]);

  useEffect(() => {
    startRef.current?.();
  }, [resourceKey]);

  return { events: enabled ? events : EMPTY_EVENTS };
}
