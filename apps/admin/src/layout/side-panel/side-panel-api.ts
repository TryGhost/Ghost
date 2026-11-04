import { type SidePanelHandle, type SidePanelOptions, sidePanelStore } from './side-panel-store';

/**
 * Code outside Admin calls this and isn't deployed with it, so it must stay
 * compatible: add to it, but don't change or remove what's there.
 */
export interface GhostSidePanelApi {
  /** Returns null when the panel can't show. */
  open: (element: HTMLElement, options?: SidePanelOptions) => SidePanelHandle | null;
  close: () => void;
  isOpen: () => boolean;
}

declare global {
  interface Window {
    ghost?: {
      sidePanel: GhostSidePanelApi;
    };
  }
}

/** Runs at import, so it's in place before any other script runs. */
export function installSidePanelApi(): void {
  window.ghost = {
    ...window.ghost,
    sidePanel: {
      open: (element, options) => sidePanelStore.open(element, options),
      close: () => sidePanelStore.close(),
      isOpen: () => sidePanelStore.isOpen(),
    },
  };
}
