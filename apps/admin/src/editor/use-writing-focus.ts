import { type RefObject, useEffect, useReducer, useSyncExternalStore } from 'react';
import { CHROME_SHOWN, type WritingFocus, isWritingInput, nextWritingFocus } from './writing-focus';

/** A mouse or trackpad on a screen at or above the small breakpoint. */
const POINTER_SCREEN = '(pointer: fine) and (width >= 480px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(POINTER_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function usePointerScreen() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(POINTER_SCREEN).matches);
}

/** Each piece of chrome carries its `data-writing-focus`; what is written inside one doesn't count. */
function isChrome(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('[data-writing-focus]');
}

interface UseWritingFocusOptions {
  /** The admin7EditorImprovements flag. */
  enabled: boolean;
  /** Keeps the chrome shown: the settings panel is open or moving, or the status needs attention. */
  blocked: boolean;
  /** The title, excerpt and body, with the chrome that sits among them. */
  writingAreaRef: RefObject<HTMLElement | null>;
}

/**
 * Hides the editor's chrome while the writer types and shows it again when the
 * pointer moves, the writer scrolls with a wheel or trackpad, focus leaves the
 * writing area or Esc goes unused. Returns
 * undefined where the behaviour is off (the flag, touch and small screens), so
 * the chrome carries no `data-writing-focus` there.
 */
export function useWritingFocus({
  enabled,
  blocked,
  writingAreaRef,
}: UseWritingFocusOptions): WritingFocus | undefined {
  const active = usePointerScreen() && enabled;
  const [state, dispatch] = useReducer(nextWritingFocus, CHROME_SHOWN);

  useEffect(() => {
    if (blocked || !active) {
      dispatch({ type: 'reveal' });
    }
  }, [blocked, active]);

  useEffect(() => {
    const writingArea = writingAreaRef.current;
    // While blocked nothing hides, so there is nothing to bring back either.
    if (!active || blocked || !writingArea) {
      return;
    }

    const onEdit = (event: Event) => {
      if (isChrome(event.target)) {
        return;
      }
      if (event instanceof InputEvent && !isWritingInput(event.inputType)) {
        return;
      }
      dispatch({ type: 'edit' });
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      // Koenig renders its link, mention and emoji inputs into portals on the body.
      const writing =
        target instanceof Element &&
        (writingArea.contains(target) || !!target.closest('[data-kg-portal]'));
      if (!writing || isChrome(target)) {
        dispatch({ type: 'reveal' });
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        dispatch({ type: 'reveal' });
      }
    };

    // Koenig handles paste and cut itself, so no beforeinput follows them.
    writingArea.addEventListener('beforeinput', onEdit, true);
    writingArea.addEventListener('paste', onEdit, true);
    writingArea.addEventListener('cut', onEdit, true);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      writingArea.removeEventListener('beforeinput', onEdit, true);
      writingArea.removeEventListener('paste', onEdit, true);
      writingArea.removeEventListener('cut', onEdit, true);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, blocked, writingAreaRef]);

  // The pointer and the wheel are only followed while the chrome is hidden. A
  // wheel event comes from the writer alone, unlike the scrolls Koenig makes to
  // keep the caret in view while they type.
  useEffect(() => {
    if (!state.hidden) {
      return;
    }
    const onMouseMove = (event: MouseEvent) =>
      dispatch({ type: 'pointer-move', point: { x: event.clientX, y: event.clientY } });
    const onWheel = () => dispatch({ type: 'reveal' });
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('wheel', onWheel);
    };
  }, [state.hidden]);

  if (!active) {
    return undefined;
  }
  // Shown already in the render that blocks it, before the effect resets the state.
  return state.hidden && !blocked ? 'hidden' : 'shown';
}
