import { createContext, useContext } from 'react';

/**
 * Whether this editor session opened through a screen transition, so its
 * floating chrome slides in from the screen edges as it first renders.
 */
export const EditorChromeEntranceContext = createContext(false);

export function useEditorChromeEntrance(): boolean {
  return useContext(EditorChromeEntranceContext);
}
