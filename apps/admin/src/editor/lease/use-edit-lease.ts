import { useEffect, useRef, useState } from 'react';
import type { ActivePresence } from '@/shared/presence/presence-api';
import type { LeaseStatus } from '@/shared/presence/use-presence';

/** Once the previous holder has been told, or has gone: time for its last save to land. */
export const TAKEOVER_GRACE_MS = 3_000;
/** The longest a takeover waits on a holder that never answers. */
export const TAKEOVER_MAX_MS = 12_000;

/** Whether this tab may edit the document, and why not when it may not. */
export type EditLease =
  | { locked: false }
  /** Not known yet, or this tab has just become the holder and is reading the latest copy. */
  | { locked: true; reason: 'pending' }
  | { locked: true; reason: 'held'; userId: string; ownTab: boolean; lost: boolean }
  /** This tab took the lease over and is waiting for the previous holder's last save. */
  | { locked: true; reason: 'taking' };

export interface LeaseTrack {
  lease: LeaseStatus;
  /** The server has answered since the editor opened. */
  answered: boolean;
  /** This tab was not the holder at some point since it read the document, so its copy may be behind. */
  stale: boolean;
  /** This tab held the lease and another took it. */
  lost: boolean;
  /** The last holder other than this tab. */
  holder: string | null;
  /** Counts the times this tab became the holder of a copy that may be behind. */
  sync: number;
  syncing: boolean;
}

export const INITIAL_TRACK: LeaseTrack = {
  lease: null,
  answered: false,
  stale: false,
  lost: false,
  holder: null,
  sync: 0,
  syncing: false,
};

const holds = (lease: LeaseStatus) => typeof lease === 'object' && lease !== null && lease.mine;

/** What a new answer about the lease means for a tab that has seen the earlier ones. */
export function advanceLease(track: LeaseTrack, lease: LeaseStatus): LeaseTrack {
  if (lease === null || lease === 'pending') {
    return { ...track, lease, stale: track.stale || track.answered, syncing: false };
  }
  if (!lease.mine) {
    return {
      ...track,
      lease,
      answered: true,
      stale: true,
      lost: track.lost || holds(track.lease),
      holder: lease.userId,
      syncing: false,
    };
  }
  // The first answer finds the copy the editor has just read; any later one may find it behind.
  const behind = track.stale && !holds(track.lease);
  return {
    ...track,
    lease,
    answered: true,
    lost: false,
    sync: behind ? track.sync + 1 : track.sync,
    syncing: behind || track.syncing,
  };
}

export interface EditLeaseOptions {
  lease: LeaseStatus;
  /** The others on the document, which shows whether the previous holder has polled since a takeover. */
  active: ActivePresence[];
  currentUserId?: string;
  isDirty: () => boolean;
  /** Saves a draft's unsaved work at once. */
  flush: () => void;
  reload: () => Promise<unknown>;
}

/**
 * Turns the lease into whether this tab may edit. A tab that becomes the
 * holder after someone else may have written reads the latest copy before it
 * unlocks, unless it holds unsaved work, which the save's own collision check
 * then judges. After a takeover it first gives the previous holder's editor
 * time to learn of it and land its last save. A tab that loses the lease saves
 * its draft at once, so the next holder reads those words.
 */
export function useEditLease({
  lease,
  active,
  currentUserId,
  isDirty,
  flush,
  reload,
}: EditLeaseOptions): EditLease {
  const [track, setTrack] = useState<LeaseTrack>(INITIAL_TRACK);
  if (track.lease !== lease) {
    setTrack(advanceLease(track, lease));
  }

  const ports = useRef({ isDirty, flush, reload });
  // Refs may not be written during render; the effects below read the latest callbacks.
  useEffect(() => {
    ports.current = { isDirty, flush, reload };
  });

  useEffect(() => {
    if (track.lost) {
      ports.current.flush();
    }
  }, [track.lost]);

  const held = typeof track.lease === 'object' ? track.lease : null;
  const takenAt = held?.mine ? held.takenAt : undefined;
  const previous = active.find((entry) => entry.userId === track.holder);
  // A holder no longer listed has left; one listed with a later heartbeat has been told.
  const told = takenAt === undefined || !previous || previous.ts > takenAt;
  const { sync, syncing } = track;
  const finished = useRef(0);

  useEffect(() => {
    if (!syncing) {
      return;
    }
    const finish = () => {
      if (finished.current === sync) {
        return;
      }
      finished.current = sync;
      void (async () => {
        if (!ports.current.isDirty()) {
          await ports.current.reload();
        }
        setTrack((current) =>
          current.sync === sync && current.syncing
            ? { ...current, stale: false, syncing: false }
            : current,
        );
      })();
    };
    const wait = takenAt === undefined ? 0 : told ? TAKEOVER_GRACE_MS : TAKEOVER_MAX_MS;
    const timer = setTimeout(finish, wait);
    return () => clearTimeout(timer);
  }, [sync, syncing, takenAt, told]);

  if (track.lease === null) {
    return { locked: false };
  }
  if (track.lease === 'pending') {
    return { locked: true, reason: 'pending' };
  }
  if (!track.lease.mine) {
    return {
      locked: true,
      reason: 'held',
      userId: track.lease.userId,
      ownTab: track.lease.userId === currentUserId,
      lost: track.lost,
    };
  }
  if (track.syncing) {
    return { locked: true, reason: takenAt === undefined ? 'pending' : 'taking' };
  }
  return { locked: false };
}
