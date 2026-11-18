import { useRef, useState, type HTMLAttributes, type PointerEvent } from 'react';

/** Touch feedback for a row, without capturing pointers or blocking scrolling. */
export function useRowPress<Element extends HTMLElement>(
  props: HTMLAttributes<Element> = {},
  enabled = true,
) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = useState(false);

  const clear = () => {
    origin.current = null;
    setPressed(false);
  };

  return {
    'data-row-pressed': enabled && pressed ? 'true' : undefined,
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
      origin.current = { x: event.clientX, y: event.clientY };
      setPressed(true);
    },
    onPointerMove(event: PointerEvent<Element>) {
      props.onPointerMove?.(event);
      if (
        origin.current &&
        Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 8
      ) {
        clear();
      }
    },
    onPointerUp(event: PointerEvent<Element>) {
      props.onPointerUp?.(event);
      clear();
    },
    onPointerCancel(event: PointerEvent<Element>) {
      props.onPointerCancel?.(event);
      clear();
    },
    onPointerLeave(event: PointerEvent<Element>) {
      props.onPointerLeave?.(event);
      clear();
    },
  };
}
