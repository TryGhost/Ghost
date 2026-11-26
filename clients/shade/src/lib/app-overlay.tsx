import * as React from 'react';
import { hasSafeArea } from '@/lib/safe-area';
import { setRef } from '@/lib/set-ref';

export type AppOverlayTint = 'dialog' | 'sheet';

const OVERLAY_TINTS: Record<AppOverlayTint, string> = {
  dialog: 'bg-black/30 dark:bg-black/60',
  sheet: 'bg-black/10',
};

/** A modal's tint classes. Admin draws the same tint behind an app's dialogs and sheets. */
export const overlayTint = (tint: AppOverlayTint) => OVERLAY_TINTS[tint];

/** A dialog or sheet's hold on the overlay, from when it mounts until it unmounts. */
export interface AppOverlayHold {
  /** True once the dialog opens, false as soon as it starts to close. */
  setOpen(open: boolean): void;
  /** Called after the dialog's closing animation, once it has unmounted. */
  release(): void;
}

/**
 * Where an app's dialogs and sheets render, so they cover all of Admin rather than only the
 * app's frame. Pass the app SDK's `ghost.overlay` to `ShadeApp` as `overlay`.
 */
export interface AppOverlay {
  /** The element to render into, or undefined to render in the page. */
  container(): HTMLElement | undefined;
  /** Called with the dialog's content element as it mounts. */
  hold(tint: AppOverlayTint, element: HTMLElement): AppOverlayHold;
}

export const AppOverlayContext = React.createContext<AppOverlay | undefined>(undefined);

interface OverlayToasts {
  /** The overlay to give the dialogs, which tracks the ones open there. */
  overlay: AppOverlay | undefined;
  /** The overlay's container while a dialog is open there, else undefined for the page. */
  toasterContainer: HTMLElement | undefined;
}

/** Tracks the dialogs open in the overlay, so toasts can show above them. */
export function useOverlayToasts(overlay: AppOverlay | undefined): OverlayToasts {
  const [container, setContainer] = React.useState<HTMLElement>();
  const tracked = React.useMemo((): AppOverlay | undefined => {
    if (!overlay) {
      return undefined;
    }
    // The overlay root each open dialog rendered in, the last to open last.
    const openIn = new Map<object, HTMLElement>();
    const update = () => setContainer([...openIn.values()].at(-1));
    return {
      container: () => overlay.container(),
      hold(tint, element) {
        const key = {};
        const hold = overlay.hold(tint, element);
        return {
          setOpen(next) {
            hold.setOpen(next);
            openIn.delete(key);
            // A dialog that fell back to the page keeps its toasts there too.
            const root = next ? overlay.container() : undefined;
            if (root?.contains(element)) {
              openIn.set(key, root);
            }
            update();
          },
          release() {
            openIn.delete(key);
            update();
            hold.release();
          },
        };
      },
    };
  }, [overlay]);
  return { overlay: tracked, toasterContainer: overlay ? container : undefined };
}

/** Content portalled from a hosted dialog renders in the overlay too, above the dialog. */
const PortalContainerContext = React.createContext<HTMLElement | undefined>(undefined);

const ModalStateContext = React.createContext<{ open: boolean; modal: boolean } | undefined>(
  undefined,
);

interface OpenProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

/**
 * Wraps a Radix dialog `Root`'s props so its content re-renders when it opens, even from its own
 * trigger, and can then decide whether to render in the overlay. Radix re-renders only its
 * portal, and doesn't expose `modal` to the content.
 */
export function useModalOpen<P extends OpenProps>(
  props: P,
): [P, (children: React.ReactNode) => React.ReactNode] {
  const { open, defaultOpen, onOpenChange, modal = true } = props;
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false);
  const isOpen = open ?? uncontrolled;
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const state = React.useMemo(() => ({ open: isOpen, modal }), [isOpen, modal]);
  const provide = React.useCallback(
    (children: React.ReactNode) => (
      <ModalStateContext.Provider value={state}>{children}</ModalStateContext.Provider>
    ),
    [state],
  );
  return [{ ...props, onOpenChange: handleOpenChange }, provide];
}

/** The container for a Radix `Portal`: the overlay inside a hosted dialog, else the default. */
export const usePortalContainer = () => React.useContext(PortalContainerContext);

/**
 * Transparent so Admin's tint shows through, but still there so a press beside the dialog closes
 * it. A style rather than a class, to override the backdrop's colour in either theme.
 */
const HOSTED_BACKDROP_STYLE: React.CSSProperties = { background: 'transparent' };

interface Placement {
  open: boolean | undefined;
  container: HTMLElement | undefined;
}

/**
 * The overlay's container when a modal renders there, which only a modal does. Decided as it
 * opens and kept while it closes: moving it would remount the content. Outside Shade's dialog
 * roots `open` is undefined, so it decides on each render.
 */
function useHostContainer(
  overlay: AppOverlay | undefined,
  open: boolean | undefined,
  modal: boolean,
): HTMLElement | undefined {
  const place = () => (modal ? overlay?.container() : undefined);
  const [placed, setPlaced] = React.useState<Placement>(() => ({
    open,
    container: open === false ? undefined : place(),
  }));
  if (open === undefined) {
    return place();
  }
  let { container } = placed;
  if (open !== placed.open) {
    const next = open && !placed.open ? { open, container: place() } : { ...placed, open };
    setPlaced(next);
    container = next.container;
  }
  return modal ? container : undefined;
}

/** Holds the overlay for a modal's content, open while the content is. Returns the release. */
function holdOverlay(overlay: AppOverlay, tint: AppOverlayTint, element: HTMLElement) {
  const hold = overlay.hold(tint, element);
  const sync = () => hold.setOpen(element.getAttribute('data-state') === 'open');
  sync();
  // The element lives in the overlay's document, so use that window's constructor.
  const Observer = element.ownerDocument.defaultView?.MutationObserver ?? MutationObserver;
  const observer = new Observer(sync);
  observer.observe(element, { attributes: true, attributeFilter: ['data-state'] });
  return () => {
    observer.disconnect();
    hold.release();
  };
}

interface HoldTarget {
  overlay: AppOverlay;
  tint: AppOverlayTint;
}

/** The content's ref, which holds `target`'s overlay while the content is mounted. */
function useHoldingRef<T extends HTMLElement>(
  forwardedRef: React.Ref<T>,
  target: HoldTarget | undefined,
): React.RefCallback<T> {
  // The ref must stay stable: a new one makes React reattach the content, releasing the hold.
  // The insertion effect stores this render's target before React attaches the content.
  const latest = React.useRef(target);
  React.useInsertionEffect(() => {
    latest.current = target;
  });
  // Hands the element over when the caller's ref changes, as React would.
  const content = React.useRef<T | null>(null);
  const attached = React.useRef(forwardedRef);
  React.useLayoutEffect(() => {
    if (attached.current !== forwardedRef) {
      if (content.current) {
        setRef(attached.current, null);
        setRef(forwardedRef, content.current);
      }
      attached.current = forwardedRef;
    }
  }, [forwardedRef]);
  const release = React.useRef<() => void>(undefined);
  return React.useCallback((element: T | null) => {
    const held = latest.current;
    content.current = element;
    setRef(attached.current, element);
    release.current?.();
    release.current = undefined;
    if (element && held) {
      release.current = holdOverlay(held.overlay, held.tint, element);
    }
  }, []);
}

interface HostedModal<T extends HTMLElement> {
  /** The overlay when the dialog renders there, or a non-modal one opens from a dialog there. */
  portalContainer: HTMLElement | undefined;
  /** Whether the safe area is set where it renders. */
  inApp: boolean;
  modal: boolean;
  backdropStyle: React.CSSProperties | undefined;
  contentRef: React.RefCallback<T>;
  /** Wraps the content, so what it portals renders in the overlay too. */
  withPortalContainer: (children: React.ReactNode) => React.ReactNode;
}

/**
 * Renders a dialog, alert dialog or sheet in the app's overlay when there is one, holding the
 * overlay while its content is mounted.
 */
export function useHostedModal<T extends HTMLElement>(
  tint: AppOverlayTint,
  forwardedRef: React.Ref<T>,
): HostedModal<T> {
  const overlay = React.useContext(AppOverlayContext);
  const inherited = usePortalContainer();
  const state = React.useContext(ModalStateContext);
  const modal = state?.modal ?? true;
  const host = useHostContainer(overlay, state?.open, modal);
  const contentRef = useHoldingRef(forwardedRef, host && overlay ? { overlay, tint } : undefined);

  const withPortalContainer = React.useCallback(
    (children: React.ReactNode) =>
      host ? (
        <PortalContainerContext.Provider value={host}>{children}</PortalContainerContext.Provider>
      ) : (
        children
      ),
    [host],
  );

  const portalContainer = modal ? host : inherited;
  return {
    portalContainer,
    inApp: hasSafeArea(portalContainer),
    modal,
    backdropStyle: host ? HOSTED_BACKDROP_STYLE : undefined,
    contentRef,
    withPortalContainer,
  };
}
