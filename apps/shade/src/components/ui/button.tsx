import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-context';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, children, ...props }, ref) => {
    const { controlShape } = useShade();
    const Comp = asChild ? Slot : 'button';
    const resolvedShape = variant === 'link' ? 'rounded' : (shape ?? controlShape);
    const content =
      variant === 'dropdown' ? (
        <>
          {children}
          <ChevronDown
            className="-mr-0.5! -ml-1! size-4 stroke-[2px]! opacity-50"
            strokeWidth={2}
          />
        </>
      ) : (
        children
      );

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape: resolvedShape, className }))}
        {...props}
        data-control-shape={resolvedShape}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button };
