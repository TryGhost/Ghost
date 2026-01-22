import React from 'react';
import {Button, cn} from '@tryghost/shade';

export const KpiCardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('flex flex-col', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={
            cn('[&_svg]:size-4 flex items-center gap-1.5 text-base h-[22px] font-medium transition-all',
                className,
                props.onClick && 'hover:cursor-pointer hover:text-black dark:hover:text-white'
            )} {...props}>
            {children}
        </div>
    );
};

export const KpiCardValue: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('text-[26px] mt-0.5 tracking-tighter leading-none text-foreground font-semibold', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardMoreButton: React.FC<React.ComponentProps<typeof Button>> = ({children, className, ...props}) => {
    return (
        <Button className={cn('absolute right-4 top-4 z-50 hidden translate-x-10 text-black dark:text-white/80 dark:hover:text-white opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 md:!visible md:!block', className)} size='sm' variant='outline' {...props}>
            {children}
        </Button>
    );
};

const KpiCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div
            className={
                cn(
                    'group relative isolate flex flex-col border-r border-border last:border-none items-start gap-2 px-6 py-5 transition-all text-muted-foreground',
                    props.onClick ? 'hover:bg-accent/50 hover:text-foreground cursor-pointer' : 'cursor-auto',
                    className
                )}
            {...props}
        >
            {children}
        </div>
    );
};

export default KpiCard;
