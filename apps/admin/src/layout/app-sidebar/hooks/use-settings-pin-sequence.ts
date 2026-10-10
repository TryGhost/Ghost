import { useCallback, useEffect, useState } from 'react';

// Fallbacks, should the sidebar never report the step it's waiting for
const GROW_TIMEOUT = 1500;
const HOLD_TIMEOUT = 1000;

interface SequenceState {
  /** Settings' navigation is the route's. */
  settings: boolean;
  /** Since entering Settings, the capsule has reached its pinned size. */
  grown: boolean;
  /** Left Settings: still pinned while its rows leave. */
  holding: boolean;
  /** A morph the sequence started (pinning or unpinning) is in flight. */
  easing: boolean;
}

export interface SettingsPinSequence {
  /** Settings pins the capsule: while in it, and while its rows leave after it. */
  pinHeld: boolean;
  /** The body waits to swap to Settings' navigation until the capsule has grown. */
  bodyDeferred: boolean;
  /** Back from Settings, the main navigation returns quietly as the capsule shrinks. */
  quietReturn: boolean;
  morphStyle: 'bump' | 'ease';
  onPinnedMorphEnd: (pinned: boolean) => void;
  /** For the body: the outgoing rows have left. */
  onOutgoingLeft: () => void;
}

/**
 * Sequences the floating sidebar around Settings while it's unpinned
 * (`sequenced`). Entering Settings pins the capsule on a plain ease, and only
 * once it has grown to full height does the body swap to Settings' navigation;
 * leaving, the Settings rows leave first, then the capsule unpins on the same
 * ease. Pinned, Settings only swaps the body.
 *
 * Changing course midway (e.g. back out before the capsule has grown) goes
 * straight to where the new route leads: the pending steps are dropped.
 */
export function useSettingsPinSequence(
  settingsNavigation: boolean,
  sequenced: boolean,
): SettingsPinSequence {
  const [stored, setState] = useState<SequenceState>(() => ({
    settings: settingsNavigation,
    grown: true,
    holding: false,
    easing: false,
  }));

  // Follows the route in the same render, so the pin and the body change together
  let state = stored;
  if (state.settings !== settingsNavigation) {
    if (settingsNavigation) {
      // Already pinned at full height while holding, so the swap plays at once
      const pinnedAlready = !sequenced || state.holding;
      state = {
        settings: true,
        grown: pinnedAlready,
        holding: false,
        easing: sequenced && !pinnedAlready,
      };
    } else {
      // Not yet grown, the swap never played: unpin straight away
      state = {
        settings: false,
        grown: false,
        holding: sequenced && state.grown,
        easing: sequenced && !state.grown,
      };
    }
    setState(state);
  }

  const onPinnedMorphEnd = useCallback((pinned: boolean) => {
    setState((current) => {
      const grown = current.grown || (current.settings && pinned);
      if (grown === current.grown && !current.easing) {
        return current;
      }
      return { ...current, grown, easing: false };
    });
  }, []);

  const onOutgoingLeft = useCallback(() => {
    setState((current) =>
      current.holding && !current.settings ? { ...current, holding: false, easing: true } : current,
    );
  }, []);

  const growStalled = state.settings && !state.grown;
  useEffect(() => {
    if (!growStalled) {
      return;
    }
    const timer = window.setTimeout(() => onPinnedMorphEnd(true), GROW_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [growStalled, onPinnedMorphEnd]);

  useEffect(() => {
    if (!state.holding) {
      return;
    }
    const timer = window.setTimeout(onOutgoingLeft, HOLD_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [state.holding, onOutgoingLeft]);

  return {
    pinHeld: settingsNavigation || state.holding,
    bodyDeferred: settingsNavigation && !state.grown,
    quietReturn: state.holding,
    morphStyle: state.easing ? 'ease' : 'bump',
    onPinnedMorphEnd,
    onOutgoingLeft,
  };
}
