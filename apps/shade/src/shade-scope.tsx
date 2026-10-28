import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-context';

/** Carries the owning surface's design into portals without styling document.body. */
export const ShadeScope = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /**
     * Scopes the one element it wraps instead of adding a div around it. A Radix portal
     * decides when to unmount from its direct children's exit animations, so an animated
     * layer has to be that child itself rather than sit inside a plain wrapper. The scope's
     * `.shade` line-height and letter-spacing then outrank that element's own utilities.
     */
    asChild?: boolean;
  }
>(({ className, asChild, ...props }, ref) => {
  const { isAdmin7 } = useShade();
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      ref={ref}
      className={cn('shade shade-admin shade-activitypub', className)}
      {...props}
      data-admin7={isAdmin7}
    />
  );
});
ShadeScope.displayName = 'ShadeScope';
