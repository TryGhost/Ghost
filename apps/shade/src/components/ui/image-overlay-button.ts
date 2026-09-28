import { cn } from '@/lib/utils';

export const imageOverlayButtonClasses = {
  base: 'bg-surface-inverse text-surface-inverse-foreground hover:bg-surface-inverse/90 hover:text-surface-inverse-foreground',
  pressed:
    'enabled:active:bg-surface-inverse enabled:active:text-surface-inverse-foreground enabled:aria-expanded:bg-surface-inverse enabled:aria-expanded:text-surface-inverse-foreground',
} as const;

/** Keep image-overlay controls legible over the image in every button state. */
export function imageOverlayButton(isAdmin7 = true) {
  return cn(imageOverlayButtonClasses.base, isAdmin7 && imageOverlayButtonClasses.pressed);
}
