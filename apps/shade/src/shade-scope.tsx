import React from 'react';
import { cn } from '@/lib/utils';
import { getAdmin7ScopeAttributes, useAdmin7 } from '@/providers/admin7-provider';

/** Carries the owning surface's design into portals without styling document.body. */
export const ShadeScope = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const admin7 = useAdmin7();
    return (
      <div
        ref={ref}
        className={cn('shade shade-admin shade-activitypub', className)}
        {...props}
        {...getAdmin7ScopeAttributes(admin7)}
      />
    );
  },
);
ShadeScope.displayName = 'ShadeScope';
