'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { type VariantProps } from 'class-variance-authority';

import { toggleVariants } from '@/components/ui/toggle-variants';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-provider';

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    Omit<VariantProps<typeof toggleVariants>, 'isAdmin7'>
>(({ className, variant, size, shape, ...props }, ref) => {
  const { controlShape, isAdmin7 } = useShade();
  const resolvedShape = shape ?? controlShape;

  return (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(toggleVariants({ variant, size, isAdmin7, shape: resolvedShape, className }))}
      data-control-shape={resolvedShape}
      {...props}
    />
  );
});

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle };
