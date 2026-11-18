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
  | { locked: true; reason: 'taking' }
  /** This tab holds the lease, but its unsaved work is on a version someone has since saved over. */
  | { locked: true; reason: 'outdated' };

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
  /** This tab became the holder with unsaved work on a version the server has moved past. */
  outdated: boolean;
}

export const INITIAL_TRACK: LeaseTrack = {
  lease: null,
  answered: false,
  stale: false,
  lost: false,
  holder: null,
  sync: 0,
  syncing: false,
  outdated: false,
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
      outdated: false,
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
  /** Whether the server holds a later version than this tab's document. */
  hasNewerVersion: () => Promise<boolean>;
}

/**
 * Turns the lease into whether this tab may edit. A tab that becomes the
 * holder after someone else may have written reads the latest copy before it
 * unlocks. One holding unsaved work is not read over: it unlocks as it is when
 * nothing was saved meanwhile, and stays locked as outdated when something
 * was, until the writer reloads. After a takeover it first gives the previous
 * holder's editor time to learn of it and land its last save. A tab that loses
 * the lease saves its draft at once, so the next holder reads those words.
 */
export function useEditLease({
  lease,
  active,
  currentUserId,
  isDirty,
  flush,
  reload,
  hasNewerVersion,
}: EditLeaseOptions): EditLease {
  const [track, setTrack] = useState<LeaseTrack>(INITIAL_TRACK);
  let next = track.lease === lease ? track : advanceLease(track, lease);
  // A reload is the only way a locked tab loses its unsaved work, and it reads the latest copy.
  if (next.outdated && !isDirty()) {
    next = { ...next, outdated: false };
  }
  if (next !== track) {
    setTrack(next);
  }

  const ports = useRef({ isDirty, flush, reload, hasNewerVersion });
  // Refs may not be written during render; the effects below read the latest callbacks.
  useEffect(() => {
    ports.current = { isDirty, flush, reload, hasNewerVersion };
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
        let outdated = false;
        if (ports.current.isDirty()) {
          outdated = await ports.current.hasNewerVersion();
        } else {
          await ports.current.reload();
        }
        setTrack((current) =>
          current.sync === sync && current.syncing
            ? { ...current, stale: false, syncing: false, outdated }
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
  if (track.outdated) {
    return { locked: true, reason: 'outdated' };
  }
  return { locked: false };
}
