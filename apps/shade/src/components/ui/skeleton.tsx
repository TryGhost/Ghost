import React, {useMemo} from 'react';
import {cn} from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
    containerClassName?: string;
    count?: number;
    randomize?: boolean;
    minWidth?: number;
    maxWidth?: number;
}

function Skeleton({
    containerClassName,
    count = 1,
    randomize = false,
    minWidth = 70,
    maxWidth = 100,
    className,
    ...props
}: SkeletonProps) {
    const {randomWidths, keys} = useMemo(() => {
        const widths = [];
        const uniqueKeys = [];

        for (let i = 0; i < count; i++) {
            if (randomize) {
                const steps = Math.floor((maxWidth - minWidth) / 5);
                const randomStep = Math.floor(Math.random() * (steps + 1));
                const randomWidth = minWidth + (randomStep * 5);
                widths.push(`${randomWidth}%`);
            }
            uniqueKeys.push(`skeleton-${crypto.randomUUID()}`);
        }

        return {
            randomWidths: widths,
            keys: uniqueKeys
        };
    }, [count, randomize, minWidth, maxWidth]);

    return (
        <span className={containerClassName}>
            {Array.from({length: count}).map((_, index) => (
                <React.Fragment key={keys[index]}>
                    <span
                        className={cn('inline-flex w-full leading-none animate-pulse rounded-[2px] bg-primary/10', className)}
                        style={randomize ? {width: randomWidths[index]} : undefined}
                        {...props}
                    >&zwnj;</span>
                    <br />
                </React.Fragment>
            ))}
        </span>
    );
}

interface SkeletonTableProps extends React.HTMLAttributes<HTMLSpanElement> {
    lines?: number;
}

const SkeletonTable = React.forwardRef<
    HTMLDivElement,
    SkeletonTableProps
>(({className, lines = 5, ...props}, ref) => {
    if (lines < 1) {
        return <></>;
    }

    return (
        <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
            {Array.from({length: lines}, (_, i) => {
                let skeletonMaxWidth = '66%';
                switch (i % 5) {
                case 0:
                    skeletonMaxWidth = '57%';
                    break;
                case 1:
                    skeletonMaxWidth = '33%';
                    break;
                case 2:
                    skeletonMaxWidth = '40%';
                    break;
                case 3:
                    skeletonMaxWidth = '48%';
                    break;
                case 4:
                    skeletonMaxWidth = '24%';
                    break;
                }
                return (
                    <div key={i} className='flex justify-between gap-6'>
                        <div className='grow' style={{
                            maxWidth: skeletonMaxWidth
                        }}><Skeleton /></div>
                        <Skeleton className='w-[60px] self-end' />
                    </div>
                );
            })}
        </div>
    );
});
SkeletonTable.displayName = 'SkeletonTable';

export {
    Skeleton,
    SkeletonTable
};
