import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';

import { indicatorVariants } from '@/components/ui/indicator-variants';
import { cn } from '@/lib/utils';

/**
 * A lightweight status dot component for showing visual status indicators
 * with semantic colors and animation states.
 */
export interface IndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof indicatorVariants> {
  label?: string;
}

function Indicator({ className, variant, state, size, label, ...props }: IndicatorProps) {
  return (
    <span className="inline-flex items-center" {...props}>
      <span
        aria-hidden="true"
        className={cn(indicatorVariants({ variant, state, size }), className)}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export { Indicator };
