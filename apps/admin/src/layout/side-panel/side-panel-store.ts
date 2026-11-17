export type SidePanelSize = 'default' | 'full';

export interface SidePanelOptions {
  size?: SidePanelSize;
  /** Called once when this content stops showing: closed by any means, or replaced. */
  onClose?: () => void;
}

export interface SidePanelHandle {
  /** Ignored once this content has been closed or replaced. */
  close: () => void;
  /** Ignored once this content has been closed or replaced. */
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
  setAvailable: (available: boolean) => void;
  reset: () => void;
}

const CLOSED: SidePanelState = { element: null, open: false, size: 'default' };

export function createSidePanelStore(): SidePanelStore {
  let state = CLOSED;
  let available = false;
  // The open() that owns the panel's current content, so stale handles can tell.
  let session: { onClose?: () => void } | null = null;
  const listeners = new Set<() => void>();

  const setState = (next: SidePanelState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  const endSession = () => {
    const ended = session;
    session = null;
    // The caller's code: a throw mustn't stop the store or React's commit, which reset() runs in
    try {
      ended?.onClose?.();
    } catch (error) {
      reportError(error);
    }
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
    open: (element, { size = 'default', onClose } = {}) => {
      if (!available) {
        return null;
      }
      if (element !== state.element) {
        endSession();
      }
      const own = { onClose };
      session = own;
      setState({ element, open: true, size });

      return {
        close: () => {
          if (session === own) {
            close();
          }
        },
        setSize: (nextSize) => {
          if (session === own && state.size !== nextSize) {
            setState({ ...state, size: nextSize });
          }
        },
      };
    },
    close,
    isOpen: () => state.open,
    setAvailable: (next) => {
      available = next;
    },
    reset: () => {
      close();
      setState(CLOSED);
    },
  };
}

export const sidePanelStore = createSidePanelStore();
