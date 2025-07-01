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
            className={cn('flex items-center justify-center rounded-full bg-muted w-12 h-12 max-w-12 max-h-12 [&_svg]:size-4 [&_svg]:text-muted-foreground [&_svg]:shrink-0', className)}
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
        <div ref={ref} className={cn('flex flex-col items-center justify-center space-y-3 text-center', className)} {...props}>
            <EmptyBadge>
                {children}
            </EmptyBadge>
            <div className='max-w-[320px] space-y-1.5'>
                <h3 className='text-pretty text-sm font-medium tracking-normal text-foreground'>
                    {title}
                </h3>
                <p className='text-pretty text-sm leading-tight text-muted-foreground'>
                    {description}
                </p>
            </div>
            {actions && (
                <div className='mt-4 flex items-center gap-2'>
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