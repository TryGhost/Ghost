import { useEffect, useRef, useState } from 'react';
import { dequal } from 'dequal';
import { z } from 'zod';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useFeatureFlag, useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { startActivityPoller } from './activity-poller';

const resourceSchema = z.object({ id: z.string(), type: z.enum(['post', 'page']) });
const eventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  resourceType: z.enum(['post', 'page']),
  resourceId: z.string(),
  sessionId: z.string().nullable(),
  action: z.enum(['opened', 'editing', 'saved']),
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
export type PresenceResource = z.infer<typeof resourceSchema>;
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

export function usePresence(
  resources: PresenceResource[],
  currentUserId: string | undefined,
  editing?: PresenceResource,
) {
  const flag = useFeatureFlag('editorPresence');
  const { data: config } = useBrowseConfig();
  const enabled = flag && config?.config.editorPresence === true && Boolean(currentUserId);
  const fetchApi = useFetchApi();
  const [events, setEvents] = useState<PresenceEvent[]>(EMPTY_EVENTS);
  const resourceKey = JSON.stringify(resources);
  const editingKey = JSON.stringify(editing ?? null);
  const resourcesRef = useRef(resources);
  resourcesRef.current = resources;
  const startRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const current = resourceSchema.nullable().parse(JSON.parse(editingKey));
    const sessionId = getSessionId();
    let opened = false;
    let expire: ReturnType<typeof setTimeout> | undefined;
    const updateEvents = (next: PresenceEvent[]) =>
      setEvents((previous) => (dequal(previous, next) ? previous : next));
    const clear = () => {
      clearTimeout(expire);
      updateEvents(EMPTY_EVENTS);
    };
    const options = {
      clear,
      async poll(isCurrent: () => boolean) {
        const window = z.array(resourceSchema).parse(resourcesRef.current);
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
            const live = response.events.filter(
              (event) =>
                event.action !== 'saved' &&
                event.sessionId !== sessionId &&
                event.ts > response.serverTime - 30000,
            );
            clearTimeout(expire);
            // Account for clock differences so avatars expire at the right time.
            const offset = Date.now() - response.serverTime;
            const refresh = () => {
              const remaining = live.filter((event) => event.ts + offset + 30000 > Date.now());
              updateEvents(remaining);
              if (remaining.length > 0) {
                expire = setTimeout(
                  refresh,
                  Math.max(
                    1,
                    Math.min(...remaining.map((event) => event.ts + offset + 30000 - Date.now())),
                  ),
                );
              }
            };
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
  }, [enabled, fetchApi, editingKey, currentUserId]);

  useEffect(() => {
    startRef.current?.();
  }, [resourceKey]);

  return { events: enabled ? events : EMPTY_EVENTS, currentUserId };
}
