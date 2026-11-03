import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { inputGroupVariants } from '@/components/ui/input-group-variants';

export interface InputGroupProps
  extends React.ComponentProps<'div'>, VariantProps<typeof inputGroupVariants> {}

function InputGroup({ className, variant, shape, ...props }: InputGroupProps) {
  const resolvedShape = shape ?? 'rounded';
  return (
    <div
      className={cn(inputGroupVariants({ variant, shape: resolvedShape }), className)}
      data-control-shape={resolvedShape}
      data-slot="input-group"
      data-variant={variant ?? 'default'}
      role="group"
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  `flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-control font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:cursor-not-allowed [&>kbd]:rounded-[calc(var(--input-group-radius)-5px)] [&>svg:not([class*='size-'])]:size-4`,
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
        'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
        'block-start':
          'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3',
        'block-end':
          'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      className={cn(
        inputGroupAddonVariants({ align }),
        align === 'inline-end' &&
          'has-[>button[data-size$=xs]]:mr-0 has-[>button[data-size$=xs]]:pr-[calc((var(--control-height)-24px)/2-1px)]',
        align === 'inline-start' &&
          'has-[>button[data-size$=xs]]:ml-0 has-[>button[data-size$=xs]]:pl-[calc((var(--control-height)-24px)/2-1px)]',
        className,
      )}
      data-align={align}
      data-slot="input-group-addon"
      role="group"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        const control = e.currentTarget
          .closest('[data-slot="input-group"]')
          ?.querySelector<HTMLElement>('[data-slot="input-group-control"]');
        control?.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva('flex items-center gap-2 shadow-none', {
  variants: {
    size: {
      xs: "h-6 gap-1 px-2 has-[>svg]:px-2 data-[control-shape=rounded]:rounded-[calc(var(--input-group-radius)-5px)] [&>svg:not([class*='size-'])]:size-3.5",
      sm: 'h-8 gap-1.5 px-2.5 has-[>svg]:px-2.5 data-[control-shape=rounded]:rounded-control',
      'icon-xs':
        'size-6 p-0 has-[>svg]:p-0 data-[control-shape=rounded]:rounded-[calc(var(--input-group-radius)-5px)]',
      'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

const InputGroupButton = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>
>(({ className, type = 'button', variant = 'ghost', size = 'xs', ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        inputGroupButtonVariants({ size }),
        size === 'xs' ? 'text-sm!' : 'text-(length:--text-control)',
        (size === 'xs' || size === 'icon-xs') &&
          'data-[control-shape=rounded]:rounded-[calc(var(--radius-control)-(var(--control-height)-24px)/2)]',
        className,
      )}
      data-size={size}
      type={type}
      variant={variant}
      {...props}
    />
  );
});
InputGroupButton.displayName = 'InputGroupButton';

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-control text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-(--control-height) w-full flex-1 border-0 bg-transparent px-3 py-1 text-control outline-hidden file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground',
        className,
      )}
      data-slot="input-group-control"
      {...props}
    />
  ),
);
InputGroupInput.displayName = 'InputGroupInput';

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full flex-1 resize-none border-0 bg-transparent p-3 text-base outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground',
        className,
      )}
      data-slot="input-group-control"
      {...props}
    />
  ),
);
InputGroupTextarea.displayName = 'InputGroupTextarea';

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
