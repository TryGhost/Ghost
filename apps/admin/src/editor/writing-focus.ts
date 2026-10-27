/**
 * Writing focus: while the writer types, the editor's chrome (the header's
 * status and actions, the settings toggle, the word count and the empty feature
 * image bar) fades away, and moving the mouse brings it back. The back link
 * stays, so the way out is always in view.
 */

/** How the chrome stands: rendered as `data-writing-focus` on each piece of it. */
export type WritingFocus = 'shown' | 'hidden';

/** How far the pointer travels, in pixels, before it brings the chrome back. */
export const POINTER_TRAVEL_TO_REVEAL = 10;

export interface Point {
  x: number;
  y: number;
}

export interface WritingFocusState {
  hidden: boolean;
  /**
   * Where the pointer was first seen since the chrome hid. Travel is measured
   * from here, so the mousemove a browser sends when content scrolls under a
   * still pointer, at the same position, never counts.
   */
  anchor: Point | null;
}

export type WritingFocusEvent =
  | { type: 'edit' }
  | {
      type: 'pointer-move';
      point: Point;
      /**
       * How far the browser reports the pointer moved to get here. A scroll under
       * a still pointer reports none.
       */
      movement?: Point;
    }
  /** A wheel scroll, focus landing on the chrome or outside the writing area, or an unused Esc. */
  | { type: 'reveal' };

export const CHROME_SHOWN: WritingFocusState = { hidden: false, anchor: null };

export function nextWritingFocus(
  state: WritingFocusState,
  event: WritingFocusEvent,
): WritingFocusState {
  switch (event.type) {
    case 'edit':
      return state.hidden ? state : { hidden: true, anchor: null };
    case 'pointer-move': {
      if (!state.hidden) {
        return state;
      }
      if (!state.anchor) {
        // A pointer that arrives in one jump, as automation and some devices
        // move it, has already travelled far enough.
        const { movement } = event;
        if (movement && Math.hypot(movement.x, movement.y) > POINTER_TRAVEL_TO_REVEAL) {
          return CHROME_SHOWN;
        }
        return { ...state, anchor: event.point };
      }
      const travel = Math.hypot(event.point.x - state.anchor.x, event.point.y - state.anchor.y);
      return travel > POINTER_TRAVEL_TO_REVEAL ? CHROME_SHOWN : state;
    }
    case 'reveal':
      return state.hidden ? CHROME_SHOWN : state;
  }
}

/**
 * Whether a `beforeinput` is the writer writing. Formatting and undo come from
 * modifier shortcuts, which leave the chrome where it is.
 */
export function isWritingInput(inputType: string): boolean {
  return !inputType.startsWith('format') && !inputType.startsWith('history');
}
