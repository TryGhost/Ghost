import React from 'react';

export const ADMIN_FRAME_TOP_BAR_HEIGHT = 44;

/** The frame's timing, for motion choreographed with it. */
export const ADMIN_FRAME_TRANSITION = {
  duration: 520,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

/**
 * The frame's right edge, under the page card, where a panel can be portalled
 * to sit in the frame itself (View site's Customize).
 */
export const AdminFramePanelSlotContext = React.createContext<HTMLElement | null>(null);

export function useAdminFramePanelSlot(): HTMLElement | null {
  return React.useContext(AdminFramePanelSlotContext);
}
