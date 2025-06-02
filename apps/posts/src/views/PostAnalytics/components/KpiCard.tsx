import React from 'react';
import {cn} from '@tryghost/shade';

export const KpiCardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('flex flex-col', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('[&_svg]:size-4 flex items-center gap-1.5 text-base h-[22px] font-medium transition-all', className)} {...props}>
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

const KpiCard: React.FC<React.HTMLAttributes<HTMLButtonElement>> = ({children, className, ...props}) => {
    return (
        <button
            className={
                cn(
                    'group flex flex-col border-r border-border last:border-none items-start gap-2 px-6 py-5 transition-all text-muted-foreground',
                    props.onClick ? 'hover:bg-accent/50 hover:text-foreground' : 'cursor-auto',
                    className
                )}
            type='button'
            {...props}
        >
            {children}
        </button>
    );
};

export default KpiCard;
