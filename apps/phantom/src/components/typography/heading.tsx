import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const headingVariants = cva(
    '',
    {
        variants: {
            size: {
                pagetitle: 'scroll-m-20 text-2xl font-bold tracking-tighter lg:text-3xl',
                1: 'scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl',
                2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
                3: 'text-2xl font-semibold tracking-tight',
                4: 'text-xl font-semibold tracking-tight',
                5: 'text-lg font-semibold tracking-tight',
                6: 'text-base font-semibold tracking-tight'
            }
        },
        defaultVariants: {
            size: 1
        }
    }
);

export interface HeadingProps
    extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
    asChild?: boolean;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, size = 'pagetitle', asChild = false, ...props}, ref) => {
        const Comp = asChild ? Slot : (size === 'pagetitle' ? `h1` : `h${size}`);
        return (
            <Comp
                ref={ref}
                className={cn(headingVariants({size, className}))}
                {...props}
            />
        );
    }
);
Heading.displayName = 'Heading';

export {Heading, headingVariants};