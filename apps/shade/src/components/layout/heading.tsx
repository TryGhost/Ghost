import {cn} from '@/lib/utils';
import * as React from 'react';

export interface HeadingProps
    extends React.HTMLAttributes<HTMLHeadingElement> {}

const H1 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <h1
                ref={ref}
                className={cn('scroll-m-20 text-3xl leading-supertight tracking-tight font-bold', className)}
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
                className={cn('scroll-m-20 text-2xl font-bold tracking-tight first:mt-0', className)}
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

export {
    H1,
    H2,
    H3,
    H4
};
