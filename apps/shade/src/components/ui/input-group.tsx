import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {inputSurfaceClasses} from '@/components/ui/input-surface';
import {Textarea} from '@/components/ui/textarea';

function InputGroup({className, ...props}: React.ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                // Shared surface chrome (border, bg, radius, transition, invalid state).
                inputSurfaceClasses.base,
                inputSurfaceClasses.invalidWithin,

                // Wrapper layout + group context (input-group specific).
                'group/input-group relative flex w-full items-center outline-hidden',
                'h-9 has-[>textarea]:h-auto',

                // Variants based on alignment.
                'has-[>[data-align=inline-start]]:[&>input]:pl-2',
                'has-[>[data-align=inline-end]]:[&>input]:pr-2',
                'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
                'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',

                // Focus state — scoped to the input-group control specifically so that
                // focusing an InputGroupButton inside the group does NOT trigger the surface
                // focus ring. This is why we don't use inputSurface('within') here.
                'has-[[data-slot=input-group-control]:focus-visible]:border-focus-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-focus-ring/25 has-[[data-slot=input-group-control]:focus-visible]:outline-hidden',

                className
            )}
            data-slot="input-group"
            role="group"
            {...props}
        />
    );
}

const inputGroupAddonVariants = cva(
    `flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-control font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--input-group-radius)-5px)] [&>svg:not([class*='size-'])]:size-4`,
    {
        variants: {
            align: {
                'inline-start': 'order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]',
                'inline-end': 'order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]',
                'block-start': 'order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3',
                'block-end': 'order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3'
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
    'flex items-center gap-2 text-control shadow-none',
    {
        variants: {
            size: {
                xs: 'h-6 gap-1 rounded-[calc(var(--input-group-radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*=\'size-\'])]:size-3.5',
                sm: 'h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5',
                'icon-xs': 'size-6 rounded-[calc(var(--input-group-radius)-5px)] p-0 has-[>svg]:p-0',
                'icon-sm': 'size-8 p-0 has-[>svg]:p-0'
            }
        },
        defaultVariants: {
            size: 'xs'
        }
    }
);

const InputGroupButton = React.forwardRef<
    HTMLButtonElement,
    Omit<React.ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>
>(({className, type = 'button', variant = 'ghost', size = 'xs', ...props}, ref) => (
    <Button
        ref={ref}
        className={cn(inputGroupButtonVariants({size}), className)}
        data-size={size}
        type={type}
        variant={variant}
        {...props}
    />
));
InputGroupButton.displayName = 'InputGroupButton';

function InputGroupText({className, ...props}: React.ComponentProps<'span'>) {
    return (
        <span
            className={cn(
                'flex items-center gap-2 text-control text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4',
                className
            )}
            {...props}
        />
    );
}

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({className, ...props}, ref) => (
    <Input
        ref={ref}
        className={cn(
            'flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-hidden',
            className
        )}
        data-slot="input-group-control"
        {...props}
    />
));
InputGroupInput.displayName = 'InputGroupInput';

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({className, ...props}, ref) => (
    <Textarea
        ref={ref}
        className={cn(
            'flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-hidden',
            className
        )}
        data-slot="input-group-control"
        {...props}
    />
));
InputGroupTextarea.displayName = 'InputGroupTextarea';

export {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupText,
    InputGroupInput,
    InputGroupTextarea
};
