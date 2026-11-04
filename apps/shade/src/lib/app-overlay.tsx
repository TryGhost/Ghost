import * as React from 'react';

/**
 * The tint Ghost Admin shows behind a dialog or sheet in an app's overlay: a dialog's, or a
 * sheet's, which is lighter, as Shade's own overlays are.
 */
export type AppOverlayTint = 'dialog' | 'sheet';

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
  /**
   * Called with the dialog's content element, the one with `role="dialog"`, as it mounts.
   * `refused` is called if Admin won't show the overlay as the dialog opens: the dialog then
   * renders in the page until it next opens.
   */
  hold(tint: AppOverlayTint, element: HTMLElement, refused: () => void): AppOverlayHold;
}

export const AppOverlayContext = React.createContext<AppOverlay | undefined>(undefined);

/**
 * Where portalled content inside a dialog in the overlay renders: the overlay too, so a
 * Select or Popover in a dialog opens above it rather than in the page underneath.
 */
const PortalContainerContext = React.createContext<HTMLElement | undefined>(undefined);

/** Whether the dialog, alert dialog or sheet around the content is open. */
const ModalOpenContext = React.createContext<boolean | undefined>(undefined);

interface OpenProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Wraps the props of a Radix dialog's `Root` so its content re-renders when it opens, also when
 * the dialog opens itself, from its own trigger. The content decides as it opens whether to
 * render in the overlay, which depends on whether the publisher has just clicked or typed; Radix
 * would otherwise only re-render its own portal. Returns the props for `Root`, and a provider
 * for the content.
 */
export function useModalOpen<P extends OpenProps>(
  props: P,
): [P, (children: React.ReactNode) => React.ReactNode] {
  const { open, defaultOpen, onOpenChange } = props;
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen ?? false);
  const isOpen = open ?? uncontrolled;
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setUncontrolled(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  const provide = React.useCallback(
    (children: React.ReactNode) => (
      <ModalOpenContext.Provider value={isOpen}>{children}</ModalOpenContext.Provider>
    ),
    [isOpen],
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

export interface HostedModal<T extends HTMLElement> {
  /** The overlay's element when the dialog renders there, else undefined. */
  container: HTMLElement | undefined;
  /** Whether it renders in the overlay, where Admin draws the tint. */
  hosted: boolean;
  /** The style for the dialog's own overlay: transparent when hosted, so Admin's tint shows. */
  overlayStyle: React.CSSProperties | undefined;
  /** The ref for the dialog's content element, merged with the caller's own. */
  ref: React.RefCallback<T>;
  /** Wraps the dialog's children, so content they portal goes to the overlay too. */
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
  /** False for a non-modal dialog, which leaves the page behind it usable and stays there. */
  modal = true,
): HostedModal<T> {
  const overlay = React.useContext(AppOverlayContext);
  // Where a non-modal dialog renders: the overlay when it's opened from a dialog there, else the
  // page.
  const inherited = usePortalContainer();
  // Read so the content re-renders when the dialog opens.
  const open = React.useContext(ModalOpenContext);
  // Where the dialog renders is decided as it opens, and kept until it opens again, through its
  // closing animation too: moving it would remount its content. Content outside one of Shade's
  // dialog roots, which can't tell when it opens, decides on every render. The one move is when
  // Admin refuses to show the overlay as the dialog opens: it renders in the page instead, where
  // it's seen, until it next opens. It has only just opened, so it loses nothing by mounting again.
  const placement = React.useRef<HTMLElement | undefined>(undefined);
  const placedOpen = React.useRef<boolean | undefined>(undefined);
  const refused = React.useRef(false);
  const [, moved] = React.useReducer((count: number) => count + 1, 0);
  const opening = open === true && !placedOpen.current;
  if (opening) {
    refused.current = false;
  }
  if (open === undefined || opening) {
    placement.current = modal && !refused.current ? overlay?.container() : undefined;
  }
  placedOpen.current = open;
  const container = placement.current;
  const hosted = container !== undefined;

  // The ref stays the same function for the dialog's whole life: a new one would make React
  // detach and attach the content again, which would release the overlay and hold it again.
  const latest = React.useRef({ overlay, hosted, tint });
  latest.current = { overlay, hosted, tint };
  // The caller's ref gets the element as React would give it: a new ref takes it over from the
  // one before.
  const content = React.useRef<T | null>(null);
  const attached = React.useRef(forwardedRef);
  React.useLayoutEffect(() => {
    if (attached.current !== forwardedRef) {
      setRef(attached.current, null);
      attached.current = forwardedRef;
      setRef(forwardedRef, content.current);
    }
  }, [forwardedRef]);
  const cleanup = React.useRef<() => void>();
  const ref = React.useCallback((element: T | null) => {
    const current = latest.current;
    content.current = element;
    setRef(attached.current, element);
    cleanup.current?.();
    cleanup.current = undefined;
    if (!element || !current.overlay || !current.hosted) {
      return;
    }
    const hold = current.overlay.hold(current.tint, element, () => {
      refused.current = true;
      placement.current = undefined;
      moved();
    });
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

  return {
    container: modal ? container : inherited,
    hosted,
    overlayStyle: hosted ? HOSTED_OVERLAY_STYLE : undefined,
    ref,
    wrap,
  };
}
