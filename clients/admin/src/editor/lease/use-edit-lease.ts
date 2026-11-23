import { useEffect, useRef, useState } from 'react';
import type { ActivePresence } from '@/shared/presence/presence-api';
import type { LeaseStatus } from '@/shared/presence/use-presence';

/** Once the previous holder has gone, or has said it knows: time for its last save to land. */
export const TAKEOVER_GRACE_MS = 3_000;
/** For a previous holder still on the document: time for its next poll to tell it, and for its last save. */
export const TAKEOVER_MAX_MS = 12_000;
/** Work begun this recently is the few characters of a lost race, not work worth keeping in the tab. */
export const RACE_WINDOW_MS = 10_000;

/** Whether this tab may edit the document, and why not when it may not. */
export type EditLease =
  | { locked: false }
  /** Not known yet, or this tab is reading the latest copy before it opens. */
  | { locked: true; reason: 'pending' }
  | {
      locked: true;
      reason: 'held';
      userId: string;
      ownTab: boolean;
      /** This tab held the lease and it was taken. */
      lost: boolean;
      /** This tab began editing a moment after the holder did, and what it typed was put back. */
      raced: boolean;
    }
  /** This tab took the lease over and is waiting for the previous holder's last save. */
  | { locked: true; reason: 'taking' }
  /** This tab's unsaved work is on a version someone has since saved over. */
  | { locked: true; reason: 'outdated' };

export interface LeaseTrack {
  lease: LeaseStatus;
  /** The server has answered since the editor opened. */
  answered: boolean;
  /** Someone else held the lease at some point since this tab read the document, so its copy may be behind. */
  stale: boolean;
  /** This tab held the lease and another took it. */
  lost: boolean;
  /** The last holder other than this tab. */
  holder: string | null;
  /** Counts the times this tab became free to edit a copy that may be behind. */
  sync: number;
  syncing: boolean;
  /** This tab's unsaved work is on a version the server has moved past. */
  outdated: boolean;
  /** Counts the times this tab took a free lease by starting to edit. */
  claims: number;
  /** Counts the times someone else turned out to hold a lease this tab had found free. */
  beaten: number;
  /** The last such time cost this tab what it had just typed. */
  raced: boolean;
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
  claims: 0,
  beaten: 0,
  raced: false,
};

const holds = (lease: LeaseStatus) => typeof lease === 'object' && lease !== null && lease.mine;

/** What a new answer about the lease means for a tab that has seen the earlier ones. */
export function advanceLease(track: LeaseTrack, lease: LeaseStatus): LeaseTrack {
  if (lease === null || lease === 'pending') {
    return { ...track, lease, stale: track.stale || track.answered, syncing: false, raced: false };
  }
  if (lease === 'free') {
    // Nobody holds it, so this tab may edit, once it has caught up on anyone who held it meanwhile.
    return {
      ...track,
      lease,
      answered: true,
      lost: false,
      raced: false,
      sync: track.stale ? track.sync + 1 : track.sync,
      syncing: track.stale || track.syncing,
    };
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
      raced: false,
      beaten: track.lease === 'free' ? track.beaten + 1 : track.beaten,
    };
  }
  // The first answer finds the copy the editor has just read; any later one may find it behind.
  const behind = track.stale && !holds(track.lease);
  return {
    ...track,
    lease,
    answered: true,
    lost: false,
    raced: false,
    sync: behind ? track.sync + 1 : track.sync,
    syncing: behind || track.syncing,
    claims: track.lease === 'free' ? track.claims + 1 : track.claims,
  };
}

export interface EditLeaseOptions {
  lease: LeaseStatus;
  /** The others on the document, which shows whether the previous holder has left it since a takeover. */
  active: ActivePresence[];
  currentUserId?: string;
  isDirty: () => boolean;
  /** Saves a draft's unsaved work at once. */
  flush: () => void;
  reload: (options?: { discardUnsaved?: boolean; onlyIf?: () => boolean }) => Promise<unknown>;
  /** Whether the server holds a later version than this tab's document. */
  hasNewerVersion: () => Promise<boolean>;
  /** Puts back the copy the document was loaded at, with no request; false when it could not. */
  revert: () => boolean;
  /** The tab began editing a copy that was behind, and the latest was loaded over what it had typed. */
  onBehind?: () => void;
}

/**
 * Turns the lease into whether this tab may edit. Nobody holds a document
 * until someone edits it: a tab that only reads never locks anyone out, and
 * the first to type takes the lease.
 *
 * - While someone else holds it, the tab is locked.
 * - Once it is free again the tab reads the latest copy, then opens. Unsaved
 *   work is not read over: the tab opens as it is when nothing was saved
 *   meanwhile, and stays locked as outdated when something was.
 * - A tab that starts editing a free document checks that its copy is the
 *   latest, and loads the latest over what it typed when it is not.
 * - A tab that started a moment after someone else did loses the race: what
 *   it typed is put back and it locks. Work older than a moment is kept.
 * - After a takeover the tab first gives the previous holder's editor time to
 *   learn of it and land its last save: the longer wait unless that holder is
 *   known to have left. A tab that loses the lease saves its draft at once, so
 *   the next holder reads those words.
 */
export function useEditLease({
  lease,
  active,
  currentUserId,
  isDirty,
  flush,
  reload,
  hasNewerVersion,
  revert,
  onBehind,
}: EditLeaseOptions): EditLease {
  const [track, setTrack] = useState<LeaseTrack>(INITIAL_TRACK);
  const dirty = isDirty();
  let next = track.lease === lease ? track : advanceLease(track, lease);
  // A reload is the only way a locked tab loses its unsaved work, and it reads the latest copy.
  if (next.outdated && !dirty) {
    next = { ...next, outdated: false };
  }
  if (next !== track) {
    setTrack(next);
  }

  const ports = useRef({ isDirty, flush, reload, hasNewerVersion, revert, onBehind });
  // Refs may not be written during render; the effects below read the latest callbacks.
  useEffect(() => {
    ports.current = { isDirty, flush, reload, hasNewerVersion, revert, onBehind };
  });

  // When the unsaved work began, to tell a lost race from work worth keeping.
  const dirtySince = useRef<number | null>(null);
  useEffect(() => {
    dirtySince.current = dirty ? (dirtySince.current ?? Date.now()) : null;
  }, [dirty]);

  useEffect(() => {
    if (track.lost) {
      ports.current.flush();
    }
  }, [track.lost]);

  const { beaten } = track;
  useEffect(() => {
    const began = dirtySince.current;
    if (beaten === 0 || began === null || Date.now() - began > RACE_WINDOW_MS) {
      return;
    }
    if (!ports.current.revert()) {
      void ports.current.reload({ discardUnsaved: true });
    }
    setTrack((current) => (current.beaten === beaten ? { ...current, raced: true } : current));
  }, [beaten]);

  const holding = useRef(false);
  useEffect(() => {
    holding.current = holds(track.lease);
  });

  const { claims } = track;
  useEffect(() => {
    if (claims === 0) {
      return;
    }
    let superseded = false;
    // The check outlives the answer it began under. Once the lease is lost, what the
    // tab typed is all there is of it, and loading over it would lose it.
    const wanted = () => !superseded && holding.current;
    void (async () => {
      if (!(await ports.current.hasNewerVersion()) || !wanted()) {
        return;
      }
      const outcome = await ports.current.reload({ discardUnsaved: true, onlyIf: wanted });
      if (outcome === 'reloaded') {
        ports.current.onBehind?.();
      }
    })();
    return () => {
      superseded = true;
    };
  }, [claims]);

  const held = typeof track.lease === 'object' ? track.lease : null;
  const takenAt = held?.mine ? held.takenAt : undefined;
  // Only a holder no longer on the document is known to have stopped. A heartbeat since can be
  // another of its tabs, and the writer's own other tab is never listed, so neither says it heard.
  const gone =
    currentUserId !== undefined &&
    track.holder !== currentUserId &&
    !active.some((entry) => entry.userId === track.holder);
  // A tab of this browser says so itself, which is how the writer's own other tab is heard from.
  const settled = gone || (held?.mine === true && held.heard === true);
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
    const wait = takenAt === undefined ? 0 : settled ? TAKEOVER_GRACE_MS : TAKEOVER_MAX_MS;
    const timer = setTimeout(finish, wait);
    return () => clearTimeout(timer);
  }, [sync, syncing, takenAt, settled]);

  if (track.lease === null) {
    return { locked: false };
  }
  if (track.lease === 'pending') {
    return { locked: true, reason: 'pending' };
  }
  if (track.lease !== 'free' && !track.lease.mine) {
    return {
      locked: true,
      reason: 'held',
      userId: track.lease.userId,
      ownTab: track.lease.userId === currentUserId,
      lost: track.lost,
      raced: track.raced,
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
