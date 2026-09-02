// PROTOTYPE ONLY — not production code. See ./README.md
//
// Holds the chosen variant + phase and hands out a stubbed AnalyticsStatus.
// Nothing here talks to the API; a real implementation would poll
// GET /emails/:id/analytics and derive the same shape.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PLAYBACK_MS,
  PREPARING_END_POSITION,
  PREPARING_ETA_SECONDS,
  PrototypeContext,
  type PrototypeContextValue,
  type PrototypeState,
  SEND_COMPLETE_POSITION,
  SENDING_ETA_SECONDS,
  STORAGE_KEY,
  buildStatus,
  playbackProgress,
  playbackStates,
  readStoredState,
} from './prototype-context';

/**
 * The current phase's remaining budget on the send's fictional clock:
 * preparation counts down from its two minutes, then sending from its four.
 * See PREPARING_ETA_SECONDS for why this is not the playback's own clock.
 */
const etaSecondsAt = (position: number): number | null => {
  if (position < PREPARING_END_POSITION) {
    return Math.ceil((1 - position / PREPARING_END_POSITION) * PREPARING_ETA_SECONDS);
  }
  if (position < SEND_COMPLETE_POSITION) {
    const sendSpan = SEND_COMPLETE_POSITION - PREPARING_END_POSITION;
    const remaining = (SEND_COMPLETE_POSITION - position) / sendSpan;
    return Math.ceil(remaining * SENDING_ETA_SECONDS);
  }
  return null;
};
import type { CountingState, EmailDataTreatment, SendState, StatusVariant } from './types';

const PrototypeAnalyticsStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PrototypeState>(readStoredState);
  const [isPlaying, setIsPlaying] = useState(false);
  // Where playback has got to, 0-1. Null when nothing has been played, which is
  // also how the switcher takes control back: any manual pick clears it.
  const [position, setPosition] = useState<number | null>(null);
  // Mirror for the playback effect, which must read the position it resumes
  // from without restarting its interval on every tick.
  const positionRef = useRef(position);
  positionRef.current = position;

  // A clock, not a sequence of frames. Ticking often enough that the figures
  // climb rather than hop, and holding the last position when it ends so the
  // settled send stays on screen — a playback that snapped back to zero would
  // undo the one state anyone wants to sit and look at.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    // Backdate the start by the held position so a paused run continues where
    // it stopped; play() resets the position first when starting fresh.
    const startedAt = Date.now() - (positionRef.current ?? 0) * PLAYBACK_MS;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;

      if (elapsed >= PLAYBACK_MS) {
        setPosition(1);
        setIsPlaying(false);
        return;
      }

      setPosition(elapsed / PLAYBACK_MS);
    }, 120);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // DEMO ONLY: publishing writes 'ghost-last-published-post' for the share
  // modal, and this provider's effect runs before the parent hook that
  // consumes and clears it (child effects fire first), so a fresh publish
  // auto-starts playback — Publish in the editor rolls straight into a live
  // send behind the share modal, repeatably: every publish rewrites the key.
  useEffect(() => {
    try {
      if (window.localStorage.getItem('ghost-last-published-post')) {
        setPosition(0);
        setIsPlaying(true);
      }
    } catch {
      // Prototype convenience only.
    }
  }, []);

  const persist = useCallback((next: PrototypeState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Prototype convenience only — losing the selection is harmless.
    }
  }, []);

  const value = useMemo<PrototypeContextValue>(() => {
    const progress = position === null ? undefined : playbackProgress(position);

    // While a position is held the pipeline follows it rather than the stored
    // pick, and the fixture has to be built from the SAME pair the switcher
    // highlights. Handing it `state.send` instead left the derived state on the
    // surface only: a playback that had run to the end still carried whatever
    // was last chosen underneath, so `isSendFullyAccountedFor` saw 'sending',
    // and the settled send finished under a live blue arrow instead of the
    // green check. Anything reading `status.send.state` was reading the pick,
    // not the playback — including the failure branches, which would have
    // rendered a failed send mid-playback if that was what was selected.
    const played = progress ? playbackStates(progress) : null;
    const activeSend = played ? played.send : state.send;
    const activeCounting = played ? played.counting : state.counting;

    return {
      ...state,
      send: activeSend,
      counting: activeCounting,
      status: buildStatus(activeSend, activeCounting, progress),
      // Recomputed on every tick because `position` is a dependency of this
      // memo, which is what makes the line's estimate count down live.
      sendEtaSeconds: isPlaying && position !== null ? etaSecondsAt(position) : null,
      isPlaying,
      isPaused: !isPlaying && position !== null && position < 1,
      hasPlayback: position !== null,
      play: () => {
        // Resume a paused run from where it stopped; a finished (or never
        // started) one begins again.
        if (position === null || position >= 1) {
          setPosition(0);
        }
        setIsPlaying(true);
      },
      pause: () => setIsPlaying(false),
      stop: () => {
        setIsPlaying(false);
        setPosition(null);
      },
      setVariant: (variant: StatusVariant) => persist({ ...state, variant }),
      setSend: (send: SendState) => {
        setPosition(null);
        persist({ ...state, send });
      },
      setCounting: (counting: CountingState) => {
        setPosition(null);
        persist({ ...state, counting });
      },
      setEmailData: (emailData: EmailDataTreatment) => persist({ ...state, emailData }),
    };
  }, [state, persist, isPlaying, position]);

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
};

export default PrototypeAnalyticsStatusProvider;
