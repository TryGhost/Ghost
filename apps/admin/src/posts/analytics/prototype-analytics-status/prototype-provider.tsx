// PROTOTYPE ONLY — not production code. See ./README.md
//
// Holds the chosen variant + phase and hands out a stubbed AnalyticsStatus.
// Nothing here talks to the API; a real implementation would poll
// GET /emails/:id/analytics and derive the same shape.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PLAYBACK_MS,
  PrototypeContext,
  type PrototypeContextValue,
  type PrototypeState,
  STORAGE_KEY,
  buildStatus,
  playbackProgress,
  playbackStates,
  readStoredState,
} from './prototype-context';
import type { CountingState, EmailDataTreatment, SendState, StatusVariant } from './types';

const PrototypeAnalyticsStatusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<PrototypeState>(readStoredState);
  const [isPlaying, setIsPlaying] = useState(false);
  // Where playback has got to, 0-1. Null when nothing has been played, which is
  // also how the switcher takes control back: any manual pick clears it.
  const [position, setPosition] = useState<number | null>(null);

  // A clock, not a sequence of frames. Ticking often enough that the figures
  // climb rather than hop, and holding the last position when it ends so the
  // settled send stays on screen — a playback that snapped back to zero would
  // undo the one state anyone wants to sit and look at.
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const startedAt = Date.now();
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
      isPlaying,
      play: () => {
        setPosition(0);
        setIsPlaying(true);
      },
      stop: () => setIsPlaying(false),
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
