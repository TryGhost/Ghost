import type {HTMLAttributes, ReactNode} from 'react';
import {cn} from '@/lib/utils';

export interface StickyFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
    shiftY?: string;
    height?: number;
    children?: ReactNode;
    contentClassName?: string;
}

/** Keeps actions visible at the bottom of a scrolling surface. */
export const StickyFooter = ({
    shiftY,
    height = 96,
    children,
    className,
    contentClassName,
    style,
    ...props
}: StickyFooterProps) => (
    <div
        className={cn('sticky z-[297] m-0 box-border w-full p-0', className)}
        style={{
            bottom: shiftY ? `calc(${shiftY} - 24px)` : '-24px',
            height: `${height + 24}px`,
            ...style
        }}
        {...props}
    >
        <div className="sticky bottom-0 z-[298] block h-6 bg-background" />
        <div
            className={cn('sticky bottom-0 z-[299] -mb-6 flex items-center justify-between bg-background', contentClassName)}
            style={{height}}
        >
            {children}
        </div>
        <div
            className="sticky mx-2 block h-6 rounded-full shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-border)_25%,transparent),0_-8px_16px_-3px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)]"
            style={{bottom: shiftY ? `calc(${shiftY} + ${height - 24}px)` : `${height - 24}px`}}
        />
    </div>
);
