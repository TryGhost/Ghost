import {cn} from '@/lib/utils';
import * as React from 'react';

export interface HeadingProps
    extends React.HTMLAttributes<HTMLHeadingElement> {}

const H1 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <h1
                ref={ref}
                className={cn('scroll-m-20 text-3xl leading-[1.1em] tracking-tighter font-bold', className)}
                {...props} />
        );
    }
);
H1.displayName = 'H1';

const H2 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <h2
                ref={ref}
                className={cn('scroll-m-20 text-2xl font-bold tracking-tighter first:mt-0', className)}
                {...props} />
        );
    }
);
H2.displayName = 'H2';

const H3 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <h3
                ref={ref}
                className={cn('scroll-m-20 text-xl font-semibold tracking-tight', className)}
                {...props} />
        );
    }
);
H3.displayName = 'H3';

const H4 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <h4
                ref={ref}
                className={cn('scroll-m-20 text-lg font-semibold tracking-tight', className)}
                {...props} />
        );
    }
);
H4.displayName = 'H4';

interface HTableProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    className?: string;
}

const HTable = React.forwardRef<HTMLDivElement, HTableProps>(
    ({className, ...props}, ref) => {
        return (
            <div
                ref={ref}
                className={cn('text-xs text-muted-foreground tracking-wide font-medium uppercase', className)}
                {...props} />
        );
    }
);
HTable.displayName = 'HTable';

export {
    H1,
    H2,
    H3,
    H4,
    HTable
};
