import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';

import { badgeVariants } from '@/components/ui/badge-variants';
import { useShade } from '@/providers/shade-context';
import { cn } from '@/lib/utils';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, shape, size, variant, asChild = false, ...props }: BadgeProps) {
  const { controlShape } = useShade();
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={cn(badgeVariants({ shape: shape ?? controlShape, size, variant }), className)}
      {...props}
    />
  );
}

export { Badge };
