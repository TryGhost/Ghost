import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { toggleVariants } from '@/components/ui/toggle';
import { useShade } from '@/providers/shade-provider';

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: 'default',
  variant: 'default',
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, shape, children, ...props }, ref) => {
  const { controlShape } = useShade();
  const resolvedShape = shape ?? controlShape;

  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-0.5 bg-muted p-0.5 dark:border dark:border-border dark:bg-background',
        resolvedShape === 'pill' ? 'rounded-full' : 'rounded-(--input-group-radius)',
        className,
      )}
      data-control-shape={resolvedShape}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, shape: resolvedShape }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, shape, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  const resolvedShape = shape ?? context.shape;

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
          shape: resolvedShape,
        }),
        className,
      )}
      data-control-shape={resolvedShape}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
