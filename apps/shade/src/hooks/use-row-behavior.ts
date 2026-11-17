import { useRef, type HTMLAttributes, type MouseEvent } from 'react';
import { useShade } from '@/providers/shade-context';
import { useRowPress } from '@/hooks/use-row-press';

const independentControl =
  'a, button, input, select, textarea, [role="checkbox"], [role="button"], [data-row-secondary], .shade-row-primary';

function primaryAction(row: HTMLElement): HTMLElement | null {
  return row.querySelector<HTMLElement>(
    '.shade-row-primary:not(:disabled, [aria-disabled="true"])',
  );
}

/** Shared native-action delegation; routing and callbacks remain on the control. */
export function useRowBehavior<Element extends HTMLElement>(
  props: HTMLAttributes<Element>,
  interactive?: boolean,
) {
  const { admin7Design } = useShade();
  const forwarding = useRef(false);
  const press = useRowPress<Element>();
  if (!admin7Design || interactive === false) {
    return {};
  }

  const isIndependent = (event: MouseEvent<Element>) =>
    event.target instanceof window.Element &&
    event.target !== event.currentTarget &&
    Boolean(event.target.closest(independentControl));

  return {
    'data-row-pressed': press['data-row-pressed'],
    onPointerDown(event: React.PointerEvent<Element>) {
      props.onPointerDown?.(event);
      if (interactive || props.onClick || primaryAction(event.currentTarget)) {
        press.onPointerDown(event);
      }
    },
    onPointerMove(event: React.PointerEvent<Element>) {
      props.onPointerMove?.(event);
      press.onPointerMove(event);
    },
    onPointerUp(event: React.PointerEvent<Element>) {
      props.onPointerUp?.(event);
      press.onPointerUp(event);
    },
    onPointerCancel(event: React.PointerEvent<Element>) {
      props.onPointerCancel?.(event);
      press.onPointerCancel(event);
    },
    onPointerLeave(event: React.PointerEvent<Element>) {
      props.onPointerLeave?.(event);
      press.onPointerLeave(event);
    },
    onClickCapture(event: MouseEvent<Element>) {
      if (!forwarding.current) {
        props.onClickCapture?.(event);
      }
    },
    onClick(event: MouseEvent<Element>) {
      if (event.defaultPrevented || isIndependent(event)) {
        return;
      }
      props.onClick?.(event);
      if (props.onClick || event.defaultPrevented) {
        return;
      }
      const primary = primaryAction(event.currentTarget);
      if (!primary) {
        return;
      }
      forwarding.current = true;
      try {
        primary.dispatchEvent(
          new window.MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: event.button,
            buttons: event.buttons,
            detail: event.detail,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          }),
        );
      } finally {
        forwarding.current = false;
      }
    },
    onAuxClick(event: MouseEvent<Element>) {
      if (event.defaultPrevented || isIndependent(event)) {
        return;
      }
      props.onAuxClick?.(event);
      if (props.onAuxClick || event.defaultPrevented || event.button !== 1) {
        return;
      }
      const primary = primaryAction(event.currentTarget);
      if (primary instanceof HTMLAnchorElement) {
        // Synthetic auxclick does not activate an anchor in Chromium.
        event.preventDefault();
        window.open(primary.href, '_blank', 'noopener,noreferrer');
      }
    },
  };
}
