import type { SafeArea } from '@tryghost/app-contracts';

/** Named like the browser's own `env(safe-area-inset-*)`. */
export const SAFE_AREA_VARIABLES = {
  top: '--ghost-safe-area-inset-top',
  right: '--ghost-safe-area-inset-right',
  bottom: '--ghost-safe-area-inset-bottom',
  left: '--ghost-safe-area-inset-left',
} as const satisfies Record<keyof SafeArea, string>;

export function applySafeArea(root: HTMLElement, safeArea: SafeArea) {
  for (const [edge, variable] of Object.entries(SAFE_AREA_VARIABLES)) {
    root.style.setProperty(variable, `${safeArea[edge as keyof SafeArea]}px`);
  }
}
