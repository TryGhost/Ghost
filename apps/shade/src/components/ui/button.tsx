import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-provider';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 text-control whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
  {
    variants: {
      variant: {
        default: 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive font-medium text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-control-border bg-transparent font-medium hover:bg-button-hover hover:text-accent-foreground',
        secondary: 'bg-secondary font-medium text-secondary-foreground hover:bg-secondary/80',
        ghost: 'font-medium hover:bg-accent hover:text-accent-foreground',
        link: 'font-medium text-primary underline-offset-4 hover:underline',
        dropdown:
          'border border-control-border bg-transparent hover:bg-button-hover hover:text-accent-foreground',
      },
      size: {
        default: 'h-(--control-height) px-2.5 py-2',
        sm: 'h-7 px-3 text-sm! [&_svg]:size-3',
        lg: 'h-11 px-8 text-md font-semibold',
        icon: 'size-9',
      },
      shape: {
        rounded: 'rounded-md',
        pill: 'rounded-full has-[>svg:only-child]:aspect-square has-[>svg:only-child]:size-(--control-height) has-[>svg:only-child]:p-0',
      },
    },
    compoundVariants: [
      {
        shape: 'pill',
        variant: 'default',
        size: ['default', 'sm', 'lg'],
        className: 'px-4',
      },
      {
        shape: 'pill',
        variant: ['destructive', 'outline', 'secondary', 'ghost', 'dropdown'],
        size: ['default', 'sm', 'lg'],
        className: 'px-3',
      },
      {
        shape: 'pill',
        variant: 'outline',
        className: 'border-0 shadow-control-outline active:shadow-control-outline-pressed',
      },
      {
        shape: 'pill',
        size: 'icon',
        className: 'size-(--control-height) aspect-square p-0',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'rounded',
    },
  },
);

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

export { Button, buttonVariants };
