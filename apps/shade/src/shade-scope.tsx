import React from 'react';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-context';

/** Carries the owning surface's design into portals without styling document.body. */
export const ShadeScope = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { admin7Design } = useShade();
    return (
      <div
        ref={ref}
        className={cn('shade shade-admin shade-activitypub', className)}
        {...props}
        data-admin7-design={admin7Design}
      />
    );
  },
);
ShadeScope.displayName = 'ShadeScope';
