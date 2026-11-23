/** Every size this Admin has. Content can't rely on one, as Admin deploys apart from it. */
const SIDE_PANEL_SIZES = ['default', 'full', 'minimized'] as const;

export type SidePanelSize = (typeof SIDE_PANEL_SIZES)[number];

// Minimizing is only offered while the panel floats over the page as a window
const FLOATING_SIZES: readonly SidePanelSize[] = Object.freeze([...SIDE_PANEL_SIZES]);
const DOCKED_SIZES: readonly SidePanelSize[] = Object.freeze(['default', 'full'] as const);

export interface SidePanelOptions {
  size?: SidePanelSize;
  /** Called once when this content stops showing: closed by any means, or replaced. */
  onClose?: () => void;
  /** Called while this content shows, whenever the sizes it can ask for change. */
  onSizesChange?: (sizes: readonly SidePanelSize[]) => void;
}

export interface SidePanelHandle {
  /** Ignored once this content has been closed or replaced. */
  close: () => void;
  /** Ignored once this content has been closed or replaced, or for a size not available now. */
  setSize: (size: SidePanelSize) => void;
}

export interface SidePanelState {
  /** The content, kept attached after closing until other content replaces it. */
  element: HTMLElement | null;
  open: boolean;
  size: SidePanelSize;
}

export interface SidePanelStore {
  getState: () => SidePanelState;
  subscribe: (listener: () => void) => () => void;
  open: (element: HTMLElement, options?: SidePanelOptions) => SidePanelHandle | null;
  close: () => void;
  isOpen: () => boolean;
  /** The sizes content can ask for now. */
  getSizes: () => readonly SidePanelSize[];
  setAvailable: (available: boolean) => void;
  setMinimizable: (minimizable: boolean) => void;
  reset: () => void;
}

const CLOSED: SidePanelState = { element: null, open: false, size: 'default' };

// The caller's code: a throw mustn't stop the store or React's commit, which reset() runs in
const callSafely = (callback: () => void) => {
  try {
    callback();
  } catch (error) {
    reportError(error);
  }
};

export function createSidePanelStore(): SidePanelStore {
  let state = CLOSED;
  let available = false;
  let sizes = DOCKED_SIZES;
  // The open() that owns the panel's current content, so stale handles can tell.
  let session: Pick<SidePanelOptions, 'onClose' | 'onSizesChange'> | null = null;
  const listeners = new Set<() => void>();

  // Callers outside Admin may ask for a size this Admin doesn't have, or not now
  const isAvailable = (size: unknown): size is SidePanelSize => sizes.some((own) => own === size);

  const setState = (next: SidePanelState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const endSession = () => {
    const ended = session;
    session = null;
    callSafely(() => ended?.onClose?.());
  };

  const close = () => {
    if (!state.open) {
      return;
    }
    setState({ ...state, open: false });
    endSession();
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open: (element, { size, onClose, onSizesChange } = {}) => {
      if (!available) {
        return null;
      }
      if (element !== state.element) {
        endSession();
      }
      const own = { onClose, onSizesChange };
      session = own;
      setState({ element, open: true, size: isAvailable(size) ? size : 'default' });

      return {
        close: () => {
          if (session === own) {
            close();
          }
        },
        setSize: (nextSize) => {
          if (session === own && isAvailable(nextSize) && state.size !== nextSize) {
            setState({ ...state, size: nextSize });
          }
        },
      };
    },
    close,
    isOpen: () => state.open,
    getSizes: () => sizes,
    setAvailable: (next) => {
      available = next;
    },
    // Doesn't change the size: a minimized panel stays minimized until its content restores it
    setMinimizable: (minimizable) => {
      const next = minimizable ? FLOATING_SIZES : DOCKED_SIZES;
      if (next === sizes) {
        return;
      }
      sizes = next;
      const current = session;
      callSafely(() => current?.onSizesChange?.(next));
    },
    reset: () => {
      close();
      setState(CLOSED);
    },
  };
}

export const sidePanelStore = createSidePanelStore();
