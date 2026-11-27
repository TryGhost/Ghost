import { useRef, type HTMLAttributes, type MouseEvent } from 'react';
import { useRowPress } from '@/hooks/use-row-press';

const independentControl =
  'a, button, input, select, textarea, label, [role="checkbox"], [role="button"], [data-row-secondary], .shade-row-primary';

function primaryAction(row: HTMLElement): HTMLElement | null {
  return row.querySelector<HTMLElement>(
    '.shade-row-primary:not(:disabled, [aria-disabled="true"])',
  );
}

/** Sends clicks on empty row space to its main link or button. */
export function useRowBehavior<Element extends HTMLElement>(
  props: HTMLAttributes<Element>,
  interactive?: boolean,
) {
  const forwarding = useRef(false);
  const press = useRowPress<Element>({}, interactive !== false);
  if (interactive === false) {
    return {};
  }

  const isIndependent = (event: MouseEvent<Element>) => {
    if (!(event.target instanceof window.Element)) {
      return false;
    }
    // React portals bubble through the row without belonging to its DOM.
    if (!event.currentTarget.contains(event.target)) {
      return true;
    }
    const control = event.target.closest(independentControl);
    return (
      control !== null && control !== event.currentTarget && event.currentTarget.contains(control)
    );
  };

  return {
    'data-row-pressed': press['data-row-pressed'],
    onPointerDown(event: React.PointerEvent<Element>) {
      props.onPointerDown?.(event);
      if (
        event.target instanceof window.Node &&
        event.currentTarget.contains(event.target) &&
        (interactive || props.onClick || primaryAction(event.currentTarget))
      ) {
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
      if (isIndependent(event)) {
        return;
      }
      if (event.defaultPrevented) {
        // Canceling navigation does not cancel a native control's own handler.
        if (event.currentTarget.matches('a, button')) {
          props.onClick?.(event);
        }
        return;
      }
      props.onClick?.(event);
      if (props.onClick || event.defaultPrevented) {
        return;
      }
      const primary = primaryAction(event.currentTarget);
      if (!primary || event.currentTarget.ownerDocument.getSelection()?.isCollapsed === false) {
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
      if (primary instanceof HTMLAnchorElement && primary.hasAttribute('href')) {
        // Synthetic auxclick does not activate an anchor in Chromium.
        event.preventDefault();
        const uncanceled = primary.dispatchEvent(
          new window.MouseEvent('auxclick', {
            bubbles: true,
            cancelable: true,
            button: event.button,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          }),
        );
        if (uncanceled) {
          window.open(primary.href, '_blank', 'noopener,noreferrer');
        }
      }
    },
  };
}
