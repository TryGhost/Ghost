import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { ChevronDown } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button-variants';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-context';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Disables the button and shows a spinner over its label. The label stays in
   * the layout, so the button keeps its width. Ignored with `asChild`.
   */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const { controlShape } = useShade();
    const Comp = asChild ? Slot : 'button';
    const isLoading = loading && !asChild;
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
        aria-busy={isLoading || undefined}
        className={cn(
          isLoading && 'relative',
          buttonVariants({ variant, size, shape: resolvedShape, className }),
        )}
        disabled={isLoading || disabled}
        {...props}
        data-control-shape={resolvedShape}
      >
        {isLoading ? (
          <>
            <span className="inline-flex items-center justify-center gap-1.5 opacity-0">
              {content}
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              <LoadingIndicator color="current" size="sm" />
            </span>
          </>
        ) : (
          content
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button };
