import { cn } from '@/lib/utils';

/** Background and spacing classes for custom list and table rows. */
export const rowSurfaceClasses = {
  base: 'shade-row',
  interactive: 'shade-row-interactive',
  auto: 'shade-row-auto',
  inset: 'shade-row-inset',
  end: 'shade-row-end',
  primaryAction: 'shade-row-primary',
} as const;

export function rowSurface(mode: 'interactive' | 'static' | 'auto' = 'interactive') {
  return cn(
    rowSurfaceClasses.base,
    mode === 'interactive' && rowSurfaceClasses.interactive,
    mode === 'auto' && rowSurfaceClasses.auto,
  );
}
