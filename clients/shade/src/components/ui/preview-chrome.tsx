import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { previewChromeVariants } from '@/components/ui/preview-chrome-variants';

const previewViewportVariants = cva('size-full overflow-hidden', {
  variants: {
    device: {
      desktop: 'rounded-t-xs shadow-sm',
      mobile: 'overflow-auto rounded-2xl border border-border-default',
    },
  },
  defaultVariants: {
    device: 'desktop',
  },
});

export interface PreviewChromeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof previewChromeVariants> {}

const PreviewChrome = React.forwardRef<HTMLDivElement, PreviewChromeProps>(
  ({ children, className, device = 'desktop', ...props }, ref) => (
    <div ref={ref} className={cn(previewChromeVariants({ device }), className)} {...props}>
      <div className={previewViewportVariants({ device })}>{children}</div>
    </div>
  ),
);

PreviewChrome.displayName = 'PreviewChrome';

export { PreviewChrome };
