import type { SafeArea } from '@tryghost/app-contracts';

/**
 * The CSS variables the SDK sets on the page's root element, one for each edge of the safe
 * area, in pixels. They read like the browser's own `env(safe-area-inset-*)`.
 */
export const SAFE_AREA_VARIABLES = {
  top: '--ghost-safe-area-inset-top',
  right: '--ghost-safe-area-inset-right',
  bottom: '--ghost-safe-area-inset-bottom',
  left: '--ghost-safe-area-inset-left',
} as const satisfies Record<keyof SafeArea, string>;

/** Sets the safe area's variables on `root`, replacing any it had. */
export function applySafeArea(root: HTMLElement, safeArea: SafeArea) {
  for (const [edge, variable] of Object.entries(SAFE_AREA_VARIABLES)) {
    root.style.setProperty(variable, `${safeArea[edge as keyof SafeArea]}px`);
  }
}
