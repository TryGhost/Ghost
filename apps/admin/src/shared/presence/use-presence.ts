import { useCallback, useEffect, useRef, useState } from 'react';
import { dequal } from 'dequal';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { APIError, SessionExpiredError } from '@tryghost/admin-x-framework/errors';
import { usePresenceApi } from '@tryghost/admin-x-framework/api/presence';
import { startActivityPoller, type ActivityPoller } from './activity-poller';
import { mergeActive, type LivePresence } from './merge-active';
import {
  parsePresenceResponse,
  type ActivePresence,
  type PresenceLease,
  type PresenceResource,
} from './presence-api';

const EMPTY: ActivePresence[] = [];

/** No answer this long after asking opens the editor for editing rather than wait on presence. */
export const LEASE_PENDING_MS = 5_000;
/** An answer this old, with every poll since failing, is dropped: a broken endpoint must not hold the editor shut. */
export const LEASE_STALE_MS = 60_000;

/**
 * Who may edit the document. `pending` until the server has answered, `free`
 * while nobody holds it, `null` when the server keeps no lease for this client
 * (not asked for, an older server, or presence failing), otherwise the holder.
 * `takenAt` is the server time at which this tab took the lease over, while it
 * still holds it.
 */
export type LeaseStatus = (PresenceLease & { takenAt?: number }) | 'pending' | 'free' | null;

export interface PresenceOptions {
  /** Follow the lease on the document this tab is editing. */
  lease?: boolean;
  /** The tab has work of its own, so it asks for the lease rather than only watching who holds it. */
  wantsLease?: boolean;
}

/** The Labs flag; an older backend without the endpoint answers 404 and polling stops. */
export function usePresenceEnabled(): boolean {
  return useFeatureFlag('editorPresencePolling');
}

/**
 * Poll presence for `resources` while the tab is visible and, when `editing`
 * is set, record this user on that resource with every poll. Returns other
 * users active on the requested resources; the server never returns the caller.
 * With `lease`, the tab also learns who holds the edited document and keeps
 * polling while hidden so it does not lose its place. It only watches until it
 * `wantsLease`; from then, and for as long as it holds the lease, it asks for it.
 */
export function usePresence(
  resources: PresenceResource[],
  editing?: PresenceResource,
  options: PresenceOptions = {},
): { active: ActivePresence[]; lease: LeaseStatus; takeOver: () => void } {
  const enabled = usePresenceEnabled();
  const api = usePresenceApi();
  const [active, setActive] = useState<ActivePresence[]>(EMPTY);
  const [answer, setAnswer] = useState<{ key: string; lease: LeaseStatus } | null>(null);
  const resourceKey = JSON.stringify(resources);
  const editingId = editing?.id;
  const editingType = editing?.type;
  const leaseKey =
    enabled && options.lease && editingId && editingType ? `${editingType}:${editingId}` : null;
  const takeRef = useRef(false);
  const wantsRef = useRef(false);
  const holdingRef = useRef(false);
  const pollerRef = useRef<ActivityPoller | undefined>(undefined);
  const resourcesRef = useRef(resources);
  // Refs may not be written during render; the poller reads the latest window at poll time.
  useEffect(() => {
    resourcesRef.current = resources;
  });
  const startRef = useRef<(() => void) | undefined>(undefined);

  // Before the polling effect, so the first poll already knows. The claim goes
  // out with the first edit, not with the next poll due.
  const wantsLease = options.wantsLease ?? false;
  useEffect(() => {
    wantsRef.current = wantsLease;
    if (wantsLease && !holdingRef.current) {
      pollerRef.current?.pollNow();
    }
  }, [wantsLease]);

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
    takeRef.current = false;
    holdingRef.current = false;
    let leaseSupported = true;
    let leaseAnswered = false;
    let takenAt: number | undefined;
    let failOpen: ReturnType<typeof setTimeout> | undefined;
    const answerWith = (lease: LeaseStatus) => {
      if (leaseKey) {
        setAnswer((previous) =>
          previous?.key === leaseKey && dequal(previous.lease, lease)
            ? previous
            : { key: leaseKey, lease },
        );
      }
    };
    const disarm = () => {
      clearTimeout(failOpen);
      failOpen = undefined;
    };
    const armFailOpen = () => {
      failOpen ??= setTimeout(
        () => {
          failOpen = undefined;
          answerWith(null);
        },
        leaseAnswered ? LEASE_STALE_MS : LEASE_PENDING_MS,
      );
    };
    if (leaseKey) {
      armFailOpen();
    }
    let poller: ActivityPoller | undefined;
    const start = () => {
      if (poller || resourcesRef.current.length === 0) {
        return;
      }
      poller = startActivityPoller({
        keepAliveWhileHidden: leaseKey !== null,
        onPause(reason) {
          clear();
          if (current && reason !== 'unsupported') {
            api.leave(current);
          }
          if (leaseKey && reason !== 'disposed') {
            // Leaving gave the place up, so the answer no longer holds until the next poll.
            disarm();
            leaseAnswered = false;
            holdingRef.current = false;
            answerWith(reason === 'unsupported' ? null : 'pending');
          }
        },
        async poll(isCurrent) {
          const window = resourcesRef.current;
          if (window.length === 0) {
            return undefined;
          }
          const asking = takeRef.current
            ? 'take'
            : holdingRef.current || wantsRef.current
              ? 'hold'
              : 'watch';
          const mode = leaseKey && leaseSupported ? asking : undefined;
          try {
            let raw: unknown;
            try {
              raw = await api.poll(window, current, mode);
            } catch (error) {
              // An older server refuses the field it does not know. Presence itself still works there.
              if (!mode || !(error instanceof APIError) || error.response?.status !== 422) {
                throw error;
              }
              leaseSupported = false;
              disarm();
              answerWith(null);
              raw = await api.poll(window, current);
            }
            const response = parsePresenceResponse(raw);
            if (isCurrent()) {
              live = mergeActive(live, response, window, Date.now());
              refresh();
              if (mode && leaseSupported) {
                disarm();
                leaseAnswered = true;
                if (mode === 'take') {
                  takeRef.current = false;
                  takenAt = response.serverTime;
                }
                if (!response.lease?.mine) {
                  takenAt = undefined;
                }
                holdingRef.current = response.lease?.mine ?? false;
                if (response.lease) {
                  answerWith({ ...response.lease, ...(takenAt === undefined ? {} : { takenAt }) });
                } else {
                  answerWith(response.lease === null ? 'free' : null);
                }
              }
            }
            return true;
          } catch (error) {
            // An expired session is a 403 too, and clears once the editor's re-auth dialog succeeds.
            if (
              error instanceof APIError &&
              !(error instanceof SessionExpiredError) &&
              [403, 404].includes(error.response?.status ?? 0)
            ) {
              return false;
            }
            if (isCurrent()) {
              clear();
            }
            if (leaseKey && leaseSupported) {
              armFailOpen();
            }
            throw error;
          }
        },
      });
      pollerRef.current = poller;
    };
    startRef.current = start;
    start();
    return () => {
      startRef.current = undefined;
      pollerRef.current = undefined;
      poller?.stop();
      clearTimeout(expire);
      disarm();
    };
  }, [enabled, api, editingId, editingType, leaseKey]);

  const takeOver = useCallback(() => {
    takeRef.current = true;
    pollerRef.current?.pollNow();
  }, []);

  // Rows can appear after mount; scrolling must not restart a running poller.
  useEffect(() => {
    startRef.current?.();
  }, [resourceKey]);

  const lease: LeaseStatus = !leaseKey ? null : answer?.key === leaseKey ? answer.lease : 'pending';
  return { active: enabled ? active : EMPTY, lease, takeOver };
}
