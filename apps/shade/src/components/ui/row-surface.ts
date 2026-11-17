import { cn } from '@/lib/utils';

/** Shared row chrome. Consumers keep their own semantics, layout and actions. */
export const rowSurfaceClasses = {
  base: 'shade-row',
  interactive: 'shade-row-interactive',
  inset: 'shade-row-inset',
  primaryAction: 'shade-row-primary',
} as const;

export function rowSurface(mode: 'interactive' | 'static' = 'interactive') {
  return cn(rowSurfaceClasses.base, mode === 'interactive' && rowSurfaceClasses.interactive);
}
