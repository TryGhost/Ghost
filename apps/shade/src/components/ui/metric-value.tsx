import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { admin7AnalyticsLabel } from '@/lib/admin7-analytics';
import { cn } from '@/lib/utils';

const metricValueRootVariants = cva('flex w-full flex-col items-start gap-2');

// ANALYTICS PROTOTYPE: the `admin7-analytics:` classes are the Admin 7
// analytics style: small caps mono labels, bigger and lighter numbers. Style
// only, applied while the milestone's root attribute is on.
const metricValueLabelVariants = cva(
  `flex h-[22px] items-center gap-1.5 text-base font-medium text-muted-foreground [&_svg]:size-4 ${admin7AnalyticsLabel}`,
);

const metricValueNumberVariants = cva(
  'leading-none font-semibold tracking-tighter admin7-analytics:font-normal admin7-analytics:tracking-tight',
  {
    variants: {
      size: {
        md: 'text-[2.2rem] admin7-analytics:text-4xl',
        // Important, so it also beats the xl size
        lg: 'text-[1.9rem] xl:text-[2.1rem] admin7-analytics:text-3xl!',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

export interface MetricValueProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof metricValueNumberVariants> {
  label?: React.ReactNode;
  value: string | number;
  /** Optional element (e.g. TrendBadge) rendered after the value. */
  trailing?: React.ReactNode;
  /** Forwarded to the value element for testing. */
  valueTestId?: string;
}

const MetricValue = React.forwardRef<HTMLDivElement, MetricValueProps>(
  ({ className, label, value, size = 'md', trailing, valueTestId, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(metricValueRootVariants(), className)} {...props}>
        {label !== undefined && label !== null && (
          <div className={metricValueLabelVariants()} data-slot="metric-value-label">
            {label}
          </div>
        )}
        <div className="flex flex-col items-start gap-2 lg:flex-row xl:gap-3">
          <div
            className={metricValueNumberVariants({ size })}
            data-slot="metric-value-number"
            data-testid={valueTestId}
          >
            {value}
          </div>
          {trailing}
        </div>
      </div>
    );
  },
);
MetricValue.displayName = 'MetricValue';

export { MetricValue };
