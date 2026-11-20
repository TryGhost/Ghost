import * as React from 'react';
import { hasSafeArea } from '@/lib/safe-area';

/**
 * The tint Ghost Admin shows behind a dialog or sheet in an app's overlay: a dialog's, or a
 * sheet's, which is lighter, as Shade's own overlays are.
 */
export type AppOverlayTint = 'dialog' | 'sheet';

const OVERLAY_TINTS: Record<AppOverlayTint, string> = {
  dialog: 'bg-black/30 dark:bg-black/60',
  sheet: 'bg-black/10',
};

/**
 * The classes for the tint behind a modal: a dialog's or alert dialog's, or a sheet's, which is
 * lighter. Ghost Admin draws the same tint behind an app's dialogs and sheets, so theirs always
 * match Shade's own.
 */
export const overlayTint = (tint: AppOverlayTint) => OVERLAY_TINTS[tint];

/**
 * A dialog's or alert dialog's width and horizontal place: centred on the window, and moved only
 * as far as it must to stay inside the safe area a Ghost app's SDK sets as
 * `--ghost-safe-area-inset-*`. Anywhere else the variables aren't set, and nothing moves.
 */
export const SAFE_AREA_DIALOG_X =
  'w-[calc(100%_-_var(--ghost-safe-area-inset-left,0px)_-_var(--ghost-safe-area-inset-right,0px))] translate-x-[calc(-50%_+_clamp(var(--ghost-safe-area-inset-left,0px)_-_50vw_+_50%,0px,50vw_-_var(--ghost-safe-area-inset-right,0px)_-_50%))]';

/** In an app, a dialog or alert dialog no taller than the safe area, which scrolls inside. */
export const SAFE_AREA_DIALOG_HEIGHT =
  'max-h-[calc(100dvh_-_var(--ghost-safe-area-inset-top,0px)_-_var(--ghost-safe-area-inset-bottom,0px)_-_1rem)] overflow-y-auto';

/** A dialog or sheet's hold on the overlay, from when it mounts until it unmounts. */
export interface AppOverlayHold {
  /** True from when the dialog opens, false once it starts to close. */
  setOpen(open: boolean): void;
  /** Called once the dialog has unmounted, after its closing animation. */
  release(): void;
}

/**
 * Where an app running inside Ghost Admin renders its dialogs and sheets, so they cover all of
 * Admin rather than only the app's frame. The app SDK's `ghost.overlay` is one; pass it to
 * `ShadeApp` as `overlay`. Admin draws the tint behind it, so a dialog rendered into it leaves
 * out its own.
 */
export interface AppOverlay {
  /** The element to render into, or undefined to render in the page as usual. */
  container(): HTMLElement | undefined;
  /** Called with the dialog's content element, the one with `role="dialog"`, as it mounts. */
  hold(tint: AppOverlayTint, element: HTMLElement): AppOverlayHold;
}

export const AppOverlayContext = React.createContext<AppOverlay | undefined>(undefined);

/**
 * Follows which dialogs are open in the app's overlay, for toasts to show above them, as they do
 * above Admin's own. Returns the overlay for the dialogs to hold, and the element toasts render
 * in: the overlay's while a dialog is open there, else undefined, for the page.
 */
export function useOverlayToasts(
  overlay: AppOverlay | undefined,
): [AppOverlay | undefined, HTMLElement | undefined] {
  const [container, setContainer] = React.useState<HTMLElement>();
  const tracked = React.useMemo((): AppOverlay | undefined => {
    if (!overlay) {
      return undefined;
    }
    // The overlay's element, by the hold of each dialog open in it, in the order they opened.
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
            // A dialog the overlay had nowhere for renders in the page, and so do its toasts.
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

/**
 * Where portalled content inside a dialog in the overlay renders: the overlay too, so a
 * Select or Popover in a dialog opens above it rather than in the page underneath.
 */
const PortalContainerContext = React.createContext<HTMLElement | undefined>(undefined);

/** Whether the dialog, alert dialog or sheet around the content is open, and whether it's modal. */
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
 * Wraps the props of a Radix dialog's `Root` so its content re-renders when it opens, also when
 * the dialog opens itself, from its own trigger. The content decides as it opens whether to
 * render in the overlay, which depends on whether the overlay has loaded; Radix would otherwise
 * only re-render its own portal. The content also learns whether the dialog is
 * modal, which Radix keeps to itself. Returns the props for `Root`, and a provider for the content.
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
 * For a hosted dialog's own overlay: transparent, so Admin's tint shows through it. The overlay
 * stays, so a press beside the dialog lands on it and closes the dialog, as it would in the page.
 * A style rather than a class, so it overrides the overlay's colour in either theme.
 */
const HOSTED_OVERLAY_STYLE: React.CSSProperties = { background: 'transparent' };

/** Where a dialog renders, decided as it opens. */
interface Placement {
  /** Whether the dialog was open when this was decided. */
  open: boolean | undefined;
  /** The overlay's element, or undefined to render in the page. */
  container: HTMLElement | undefined;
}

interface HostedModal<T extends HTMLElement> {
  /**
   * The element to portal into: the overlay's when the dialog renders there, or, for one that
   * isn't modal, the overlay's when it opens from a dialog there; else undefined, for the page.
   */
  container: HTMLElement | undefined;
  /** Whether it's in a Ghost app, in its overlay or its page, where it keeps inside the safe area. */
  inApp: boolean;
  /** Whether it's modal. One that isn't leaves the page behind it usable, and stays there. */
  modal: boolean;
  /** The style for the dialog's own overlay: transparent when hosted, so Admin's tint shows. */
  overlayStyle: React.CSSProperties | undefined;
  /** The ref for the dialog's content element, merged with the caller's own. */
  ref: React.RefCallback<T>;
  /** Wraps the dialog's content element, so content it portals goes to the overlay too. */
  wrap: (children: React.ReactNode) => React.ReactNode;
}

/**
 * Renders a dialog, alert dialog or sheet in the app's overlay when there is one. The content
 * element holds the overlay while it's mounted, and tells it whether it's open from its
 * `data-state`, so Admin's tint fades out as the dialog starts to close, together with the
 * dialog's own closing animation.
 */
export function useHostedModal<T extends HTMLElement>(
  tint: AppOverlayTint,
  forwardedRef: React.Ref<T>,
): HostedModal<T> {
  const overlay = React.useContext(AppOverlayContext);
  // Where a non-modal dialog renders: the overlay when it's opened from a dialog there, else the
  // page.
  const inherited = usePortalContainer();
  // Read so the content re-renders when the dialog opens.
  const state = React.useContext(ModalStateContext);
  const open = state?.open;
  const modal = state?.modal ?? true;
  // Where the dialog renders is decided as it opens, and kept until it opens again, through its
  // closing animation too: moving it would remount its content. Content outside one of Shade's
  // dialog roots, which can't tell when it opens, decides on every render.
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
  // A dialog that stops being modal while open leaves the overlay too.
  const hosted = modal && container !== undefined;

  // The ref stays the same function for the dialog's whole life: a new one would make React
  // detach and attach the content again, which would release the overlay and hold it again. It
  // reads what this render decided, which is kept before React attaches the content.
  const latest = React.useRef({ overlay, hosted, tint });
  React.useInsertionEffect(() => {
    latest.current = { overlay, hosted, tint };
  });
  // The caller's ref gets the element as React would give it: a new ref takes it over from the
  // one before. While the content isn't mounted, neither ref has it, so neither is called.
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
    // The overlay's own constructor, as the element lives in the overlay's document.
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
