import React from 'react';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-provider';

/** Carries the owning surface's design into portals without styling document.body. */
export const ShadeScope = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { isAdmin7Design } = useShade();
    return (
      <div
        ref={ref}
        className={cn('shade shade-admin shade-activitypub', className)}
        data-admin7-design={isAdmin7Design}
        {...props}
      />
    );
  },
);
ShadeScope.displayName = 'ShadeScope';
