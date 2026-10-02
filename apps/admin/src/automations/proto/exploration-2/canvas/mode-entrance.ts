import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import { NODE_WIDTH } from '@/automations/proto/canvas/flow-utils';

// Switching between building the flow and reviewing a member's run.
//
// The two canvases are separate flows with slightly different layouts — a run's
// nodes carry a timestamp line, and where it ended adds a pill — so a hard cut
// between them put every card a little somewhere else, and the flow read as
// jolting rather than changing view. Instead the incoming canvas starts back at
// the top and its cards cascade in, the same fade-and-rise the edit canvas plays
// when an automation is opened. Once the view visibly rebuilds, the small layout
// differences stop reading as a jump.
//
// Quicker than the open-automation cascade (70ms a card): that one is paced for
// arriving on a screen, and this is a toggle you make often. Only on a change of
// MODE — the screen bumps the signal on entering or leaving review, not moving
// from one member to the next, where the nodes should just update in place.

export const MODE_STAGGER_MS = 40;
// How long the cards keep their delays — longer than any cascade takes. Dropped
// after, so a card's delay can't change under it and replay its animation.
const ENTRANCE_HOLD_MS = 1200;

// The entrance's epoch while it's playing, else null. Keyed onto each card's
// animated wrapper, so a new switch restarts the animation even mid-cascade.
//
// A layout effect, so the reset and the first frame of the cascade land before
// the canvas is painted — the screen shows it in the same commit that bumps the
// signal, and a passive effect would let one frame of the old view through.
export const useModeEntrance = (signal: number | undefined, reset: () => void): number | null => {
  const [epoch, setEpoch] = useState<number | null>(null);
  const previous = useRef(signal);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useLayoutEffect(() => {
    if (previous.current === signal || signal === undefined) {
      return;
    }
    previous.current = signal;
    resetRef.current();
    setEpoch(signal);
    const timer = setTimeout(() => setEpoch(null), ENTRANCE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [signal]);
  return epoch;
};

// Back to the top of the flow, centred beside the pane. The shared hook's
// recenter puts y at the flow's usual starting anchor, but centres x on the pane
// width it was mounted with — so x is set again here from the pane's current
// cover. Zoom is kept.
export const resetColumnToTop = (
  instance: ReactFlowInstance | null,
  canvasRef: RefObject<HTMLDivElement | null>,
  rightInset: number,
  recenter: () => void,
) => {
  const el = canvasRef.current;
  if (!instance || !el) {
    return;
  }
  recenter();
  const { y, zoom } = instance.getViewport();
  const x = Math.round((el.clientWidth - rightInset - NODE_WIDTH * zoom) / 2);
  void instance.setViewport({ x, y, zoom });
};
