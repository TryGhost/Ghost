import { useSyncExternalStore } from 'react';
import { sidePanelStore } from './side-panel-store';

export function useSidePanel() {
  const state = useSyncExternalStore(sidePanelStore.subscribe, sidePanelStore.getState);
  return { state, open: sidePanelStore.open, close: sidePanelStore.close };
}
