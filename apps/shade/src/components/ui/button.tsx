import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {ChevronDown} from 'lucide-react';

import {cn} from '@/lib/utils';

const buttonVariants = cva(
    'focus-visible:outline-hidden focus-visible:ring-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/90 font-medium',
                destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium',
                outline: 'border-input bg-background hover:bg-accent hover:text-accent-foreground border font-medium',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-gray-925/70 font-medium dark:hover:bg-gray-900',
                ghost: 'hover:bg-accent hover:text-accent-foreground font-medium',
                link: 'text-primary font-medium underline-offset-4 hover:underline',
                dropdown: 'border-input bg-background hover:bg-accent hover:text-accent-foreground border'
            },
            size: {
                default: 'h-[34px] px-3 py-2',
                sm: 'h-7 rounded-md px-3 text-xs [&_svg]:size-3',
                lg: 'text-md h-11 rounded-md px-8 font-semibold',
                icon: 'size-9'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant, size, asChild = false, children, ...props}, ref) => {
        const Comp = asChild ? Slot : 'button';
        const content = variant === 'dropdown' ? (
            <>
                {children}
                <ChevronDown className="-ml-1! -mr-0.5! stroke-[2px]! size-4 opacity-50" strokeWidth={2} />
            </>
        ) : children;

        return (
            <Comp
                ref={ref}
                className={cn(buttonVariants({variant, size, className}))}
                {...props}
            >
                {content}
            </Comp>
        );
    }
);
Button.displayName = 'Button';

export {Button, buttonVariants};
