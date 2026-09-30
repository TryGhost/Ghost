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
  sessionId: z.string().nullable(),
  action: z.string(),
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
// Keep the ID across route changes. Avoid sessionStorage: duplicated tabs copy it.
let tabSessionId: string | undefined;
function getSessionId() {
  if (!tabSessionId) {
    // Build a UUID with getRandomValues because randomUUID requires HTTPS.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    tabSessionId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return tabSessionId;
}

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
    const sessionId = getSessionId();
    let opened = false;
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
                    sessionId,
                    ...(current
                      ? { editing: { ...current, action: opened ? 'editing' : 'opened' } }
                      : {}),
                  },
                ],
              }),
            }),
          ).presence[0];
          if (isCurrent()) {
            opened = true;
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
