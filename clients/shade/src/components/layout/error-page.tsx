import { Stack } from '@/components/primitives';
import { cn } from '@/lib/utils';
import * as React from 'react';

export interface ErrorPageProps extends React.HTMLAttributes<HTMLDivElement> {
  onBackToDashboard?: () => void;
}

/**
 * @deprecated Prefer composing product-specific error states from primitives and shared components.
 */
const ErrorPage = React.forwardRef<HTMLDivElement, ErrorPageProps>(
  ({ className, onBackToDashboard, ...props }, ref) => {
    return (
      <Stack
        ref={ref}
        align="center"
        className={cn('h-screen w-full bg-background', className)}
        gap="none"
        justify="center"
        {...props}
      >
        <Stack
          align="start"
          className="max-w-xl rounded-[20px] bg-surface-elevated p-[5vmin] text-card-foreground shadow-lg"
          gap="lg"
        >
          <h1 className="text-[2.9rem] leading-[1.3] font-bold tracking-[-0.021em]">
            Loading interrupted
          </h1>
          <p>
            They say life is a series of trials and tribulations. This moment right here? It&apos;s
            a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back
            to the dashboard to try again.
          </p>
          <a
            className="mt-2 cursor-pointer rounded-sm border border-current px-2.5 py-1.5 text-green"
            onClick={onBackToDashboard}
          >
            &larr; Back to the dashboard
          </a>
        </Stack>
      </Stack>
    );
  },
);

ErrorPage.displayName = 'ErrorPage';

export { ErrorPage };
