import { createContext, useContext } from 'react';

/*
 * Whether the Help panel is open. HelpPanelProvider (in AdminLayout) holds it;
 * the Help items in the sidebar and account menu toggle it, falling back to
 * the help center link where there's no provider: on sites that aren't
 * Ghost(Pro), and for contributors, whose layout has no panel.
 */

export interface HelpPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const HelpPanelContext = createContext<HelpPanelContextValue | null>(null);

/** The help panel's open state, or null where Admin doesn't show it (not Ghost(Pro), or contributors). */
export function useHelpPanel() {
  return useContext(HelpPanelContext);
}
