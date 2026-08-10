import React from 'react';
import {Button} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';

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
            cn('flex h-[22px] items-center gap-1.5 text-base font-medium transition-all [&_svg]:size-4',
                className,
                props.onClick && 'hover:cursor-pointer hover:text-black dark:hover:text-white'
            )} {...props}>
            {children}
        </div>
    );
};

export const KpiCardValue: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('mt-0.5 text-[26px] leading-none font-semibold tracking-tighter text-foreground', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardMoreButton: React.FC<React.ComponentProps<typeof Button>> = ({children, className, ...props}) => {
    return (
        <Button className={cn('absolute top-4 right-4 z-50 hidden translate-x-10 text-black opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 md:visible! md:block! dark:text-white/80 dark:hover:text-white', className)} size='sm' variant='outline' {...props}>
            {children}
        </Button>
    );
};

const KpiCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div
            className={
                cn(
                    'group relative isolate flex flex-col items-start gap-2 border-r border-border px-6 py-5 text-muted-foreground transition-all last:border-none',
                    props.onClick ? 'cursor-pointer hover:bg-accent/50 hover:text-foreground' : 'cursor-auto',
                    className
                )}
            {...props}
        >
            {children}
        </div>
    );
};

export default KpiCard;
