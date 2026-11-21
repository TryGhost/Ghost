import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from 'react';

/** Touch feedback for a row, without capturing pointers or blocking scrolling. */
export function useRowPress<Element extends HTMLElement>(
  props: HTMLAttributes<Element> = {},
  enabled = true,
) {
  const origin = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [state, setState] = useState({ enabled, pressed: false });

  if (state.enabled !== enabled) {
    setState({ enabled, pressed: false });
  }

  const clear = () => {
    origin.current = null;
    setState((current) => ({ ...current, pressed: false }));
  };

  useEffect(() => {
    if (!enabled) {
      origin.current = null;
    }
  }, [enabled]);

  const release = (event: PointerEvent<Element>) => {
    if (origin.current?.pointerId === event.pointerId) {
      clear();
    }
  };

  return {
    'data-row-pressed': enabled && state.pressed ? 'true' : undefined,
    onPointerDown(event: PointerEvent<Element>) {
      props.onPointerDown?.(event);
      if (
        !enabled ||
        event.pointerType !== 'touch' ||
        event.isPrimary === false ||
        event.defaultPrevented
      ) {
        return;
      }
      origin.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      setState({ enabled, pressed: true });
    },
    onPointerMove(event: PointerEvent<Element>) {
      props.onPointerMove?.(event);
      if (
        origin.current &&
        origin.current.pointerId === event.pointerId &&
        Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 8
      ) {
        clear();
      }
    },
    onPointerUp(event: PointerEvent<Element>) {
      props.onPointerUp?.(event);
      release(event);
    },
    onPointerCancel(event: PointerEvent<Element>) {
      props.onPointerCancel?.(event);
      release(event);
    },
    onPointerLeave(event: PointerEvent<Element>) {
      props.onPointerLeave?.(event);
      release(event);
    },
  };
}
