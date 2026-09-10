import React from 'react';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-provider';

/** Carries the owning surface's design into portals without styling document.body. */
export const ShadeScope = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { isLegacyDesign } = useShade();
    return (
      <div
        ref={ref}
        className={cn(
          'shade shade-admin shade-activitypub',
          isLegacyDesign ? 'shade-design-legacy' : 'shade-design-current',
          className,
        )}
        {...props}
      />
    );
  },
);
ShadeScope.displayName = 'ShadeScope';
