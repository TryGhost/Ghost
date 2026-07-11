import {cn} from '@/lib/utils';
import React from 'react';

interface EmptyBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    className?: string;
}

const EmptyBadge = React.forwardRef<HTMLDivElement, EmptyBadgeProps>(({children, className, ...props}, ref) => {
    return (
        <div
            ref={ref}
            className={cn('flex size-12 max-h-12 max-w-12 items-center justify-center rounded-full bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground', className)}
            {...props}
        >
            {children}
        </div>
    );
});

EmptyBadge.displayName = 'EmptyBadge';

/* Empty indicator
/* -------------------------------------------------------------------------- */
interface EmptyIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    className?: string;
    title?: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}

const EmptyIndicator = React.forwardRef<HTMLDivElement, EmptyIndicatorProps>(({children, className, title, description, actions, ...props}, ref) => {
    return (
        <div ref={ref} className={cn('flex flex-col items-center justify-center gap-3 text-center', className)} {...props}>
            <EmptyBadge>
                {children}
            </EmptyBadge>
            <div className='flex max-w-[320px] flex-col gap-1.5'>
                <h3 className='text-md font-medium tracking-normal text-pretty text-foreground'>
                    {title}
                </h3>
                {description &&
                    <p className='text-sm leading-tight text-pretty text-muted-foreground'>
                        {description}
                    </p>
                }
            </div>
            {actions && (
                <div className='flex items-center gap-2'>
                    {actions}
                </div>
            )}
        </div>
    );
});

EmptyIndicator.displayName = 'EmptyIndicator';

export {
    EmptyBadge,
    EmptyIndicator
};
