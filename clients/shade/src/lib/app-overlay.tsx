import * as React from 'react';
import { hasSafeArea } from '@/lib/safe-area';

export type AppOverlayTint = 'dialog' | 'sheet';

const OVERLAY_TINTS: Record<AppOverlayTint, string> = {
  dialog: 'bg-black/30 dark:bg-black/60',
  sheet: 'bg-black/10',
};

/** A modal's tint classes. Admin draws the same tint behind an app's dialogs and sheets. */
export const overlayTint = (tint: AppOverlayTint) => OVERLAY_TINTS[tint];

/**
 * Centres a dialog on the window, moved only as far as it must to stay inside the safe area.
 * One wider than the safe area is centred on it instead.
 */
export const SAFE_AREA_DIALOG_X =
  'w-[calc(100%_-_var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))] translate-x-[calc(-50%_+_clamp(min(var(--ghost-safe-area-inset-left,0px)_-_50vw_+_50%,(var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))/2),0px,max(50vw_-_var(--ghost-safe-area-inset-right,0px)_-_50%,(var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))/2)))]';

export const SAFE_AREA_DIALOG_HEIGHT =
  'max-h-[calc(100dvh_-_var(--ghost-safe-area-inset-top,0px)_-_var(--ghost-safe-area-inset-bottom,0px)_-_1rem)] overflow-y-auto';

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

/**
 * Tracks the dialogs open in the overlay so toasts can show above them. Returns the overlay to
 * give the dialogs, and the toasts' container: the overlay's while a dialog is open there.
 */
export function useOverlayToasts(
  overlay: AppOverlay | undefined,
): [AppOverlay | undefined, HTMLElement | undefined] {
  const [container, setContainer] = React.useState<HTMLElement>();
  const tracked = React.useMemo((): AppOverlay | undefined => {
    if (!overlay) {
      return undefined;
    }
    const open = new Map<object, HTMLElement>();
    const update = () => setContainer([...open.values()].at(-1));
    return {
      container: () => overlay.container(),
      hold(tint, element) {
        const key = {};
        const hold = overlay.hold(tint, element);
        return {
          setOpen(next) {
            hold.setOpen(next);
            open.delete(key);
            // A dialog that fell back to the page keeps its toasts there too.
            const root = next ? overlay.container() : undefined;
            if (root?.contains(element)) {
              open.set(key, root);
            }
            update();
          },
          release() {
            open.delete(key);
            update();
            hold.release();
          },
        };
      },
    };
  }, [overlay]);
  return [tracked, overlay ? container : undefined];
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

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

/**
 * Transparent so Admin's tint shows through, but still there so a press beside the dialog closes
 * it. A style rather than a class, to override the overlay's colour in either theme.
 */
const HOSTED_OVERLAY_STYLE: React.CSSProperties = { background: 'transparent' };

interface Placement {
  open: boolean | undefined;
  container: HTMLElement | undefined;
}

interface HostedModal<T extends HTMLElement> {
  /** The overlay when the dialog renders there, or a non-modal one opens from a dialog there. */
  container: HTMLElement | undefined;
  inApp: boolean;
  modal: boolean;
  overlayStyle: React.CSSProperties | undefined;
  ref: React.RefCallback<T>;
  wrap: (children: React.ReactNode) => React.ReactNode;
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
  const open = state?.open;
  const modal = state?.modal ?? true;
  // Decided as the dialog opens and kept while it closes: moving it would remount the content.
  // Outside Shade's dialog roots `open` is undefined, so it decides on each render.
  const place = () => (modal ? overlay?.container() : undefined);
  const [placed, setPlaced] = React.useState<Placement>(() => ({
    open,
    container: open === false ? undefined : place(),
  }));
  let placement = placed;
  if (open === undefined) {
    placement = { ...placed, container: place() };
  } else if (open !== placed.open) {
    placement = open && !placed.open ? { open, container: place() } : { ...placed, open };
    setPlaced(placement);
  }
  const { container } = placement;
  const hosted = modal && container !== undefined;

  // The ref must stay stable: a new one makes React reattach the content, releasing the hold.
  // The insertion effect stores this render's decision before React attaches the content.
  const latest = React.useRef({ overlay, hosted, tint });
  React.useInsertionEffect(() => {
    latest.current = { overlay, hosted, tint };
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
  const cleanup = React.useRef<() => void>(undefined);
  const ref = React.useCallback((element: T | null) => {
    const current = latest.current;
    content.current = element;
    setRef(attached.current, element);
    cleanup.current?.();
    cleanup.current = undefined;
    if (!element || !current.overlay || !current.hosted) {
      return;
    }
    const hold = current.overlay.hold(current.tint, element);
    const sync = () => hold.setOpen(element.getAttribute('data-state') === 'open');
    sync();
    // The element lives in the overlay's document, so use that window's constructor.
    const Observer = element.ownerDocument.defaultView?.MutationObserver ?? MutationObserver;
    const observer = new Observer(sync);
    observer.observe(element, { attributes: true, attributeFilter: ['data-state'] });
    cleanup.current = () => {
      observer.disconnect();
      hold.release();
    };
  }, []);

  const wrap = React.useCallback(
    (children: React.ReactNode) =>
      hosted ? (
        <PortalContainerContext.Provider value={container}>
          {children}
        </PortalContainerContext.Provider>
      ) : (
        children
      ),
    [hosted, container],
  );

  const portal = modal ? container : inherited;
  return {
    container: portal,
    inApp: hasSafeArea(portal),
    modal,
    overlayStyle: hosted ? HOSTED_OVERLAY_STYLE : undefined,
    ref,
    wrap,
  };
}
