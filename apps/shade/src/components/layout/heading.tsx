import {Text} from '@/components/primitives';
import {cn} from '@/lib/utils';
import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {}

/**
 * @deprecated Prefer `Text` primitive composition for new heading usage.
 */
const H1 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <Text
                ref={ref as React.Ref<HTMLElement>}
                as='h1'
                className={cn('scroll-m-20 leading-[1.1em] tracking-tighter', className)}
                size='3xl'
                weight='bold'
                {...props}
            />
        );
    }
);
H1.displayName = 'H1';

/**
 * @deprecated Prefer `Text` primitive composition for new heading usage.
 */
const H2 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <Text
                ref={ref as React.Ref<HTMLElement>}
                as='h2'
                className={cn('scroll-m-20 tracking-tighter first:mt-0', className)}
                size='2xl'
                weight='bold'
                {...props}
            />
        );
    }
);
H2.displayName = 'H2';

/**
 * @deprecated Prefer `Text` primitive composition for new heading usage.
 */
const H3 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <Text
                ref={ref as React.Ref<HTMLElement>}
                as='h3'
                className={cn('scroll-m-20 tracking-tight', className)}
                size='xl'
                weight='semibold'
                {...props}
            />
        );
    }
);
H3.displayName = 'H3';

/**
 * @deprecated Prefer `Text` primitive composition for new heading usage.
 */
const H4 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
    ({className, ...props}, ref) => {
        return (
            <Text
                ref={ref as React.Ref<HTMLElement>}
                as='h4'
                className={cn('scroll-m-20 tracking-tight', className)}
                size='lg'
                weight='semibold'
                {...props}
            />
        );
    }
);
H4.displayName = 'H4';

interface HTableProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    className?: string;
}

/**
 * @deprecated Prefer `Text` primitive composition for metadata/label text.
 */
const HTable = React.forwardRef<HTMLDivElement, HTableProps>(
    ({className, ...props}, ref) => {
        return (
            <Text
                ref={ref as React.Ref<HTMLElement>}
                as='div'
                className={cn('tracking-wide uppercase', className)}
                size='xs'
                tone='secondary'
                weight='medium'
                {...props}
            />
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
