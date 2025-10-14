import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';

function InputGroup({className, ...props}: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'group/input-group dark:bg-input/30 border-transparent bg-gray-150 dark:bg-gray-900 relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow]',
                'h-9 has-[>textarea]:h-auto',

                // Variants based on alignment.
                'has-[>[data-align=inline-start]]:[&>input]:pl-2',
                'has-[>[data-align=inline-end]]:[&>input]:pr-2',
                'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
                'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',

                // Focus state.
                'has-[[data-slot=input-group-control]:focus-visible]:outline-none has-[[data-slot=input-group-control]:focus-visible]:bg-transparent has-[[data-slot=input-group-control]:focus-visible]:border-green has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_2px_rgba(48,207,67,.25)]',

                // Error state.
                'has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',

                className
            )}
            data-slot="input-group"
            role="group"
            {...props}
        />
    );
}

const inputGroupAddonVariants = cva(
    `flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4`,
    {
        variants: {
            align: {
                'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
                'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
                'block-start': '[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5',
                'block-end': '[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5'
            }
        },
        defaultVariants: {
            align: 'inline-start'
        }
    }
);

function InputGroupAddon({
    className,
    align = 'inline-start',
    ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
    return (
        <div
            className={cn(inputGroupAddonVariants({align}), className)}
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

const inputGroupButtonVariants = cva(
    'flex items-center gap-2 text-sm shadow-none',
    {
        variants: {
            size: {
                xs: 'h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*=\'size-\'])]:size-3.5',
                sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
                'icon-xs': 'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
                'icon-sm': 'size-8 p-0 has-[>svg]:p-0'
            }
        },
        defaultVariants: {
            size: 'xs'
        }
    }
);

function InputGroupButton({
    className,
    type = 'button',
    variant = 'ghost',
    size = 'xs',
    ...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>) {
    return (
        <Button
            className={cn(inputGroupButtonVariants({size}), className)}
            data-size={size}
            type={type}
            variant={variant}
            {...props}
        />
    );
}

function InputGroupText({className, ...props}: React.ComponentProps<'span'>) {
    return (
        <span
            className={cn(
                'text-muted-foreground flex items-center gap-2 text-sm [&_svg:not([class*=\'size-\'])]:size-4 [&_svg]:pointer-events-none',
                className
            )}
            {...props}
        />
    );
}

function InputGroupInput({
    className,
    ...props
}: React.ComponentProps<'input'>) {
    return (
        <Input
            className={cn(
                'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:shadow-none dark:bg-transparent',
                className
            )}
            data-slot="input-group-control"
            {...props}
        />
    );
}

function InputGroupTextarea({
    className,
    ...props
}: React.ComponentProps<'textarea'>) {
    return (
        <Textarea
            className={cn(
                'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:shadow-none dark:bg-transparent',
                className
            )}
            data-slot="input-group-control"
            {...props}
        />
    );
}

export {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupInput,
    InputGroupTextarea
};
