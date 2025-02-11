import React from 'react';
import {cn} from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
    containerClassName?: string;
    count?: number;
}

function Skeleton({
    containerClassName,
    count = 1,
    className,
    ...props
}: SkeletonProps) {
    return (
        <span className={containerClassName}>
            {Array.from({length: count}).map(() => (
                <React.Fragment key={`skeleton-${crypto.randomUUID()}`}>
                    <span
                        className={cn('inline-flex w-full leading-none animate-pulse rounded-[2px] bg-primary/10', className)}
                        {...props}
                    >&zwnj;</span>
                    <br />
                </React.Fragment>
            ))}
        </span>
    );
}

export {Skeleton};
