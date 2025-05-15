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
        <div className={cn('[&_svg]:size-4 flex items-center gap-1.5 text-base text-gray-700 font-medium', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardValue: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('text-[26px] mt-0.5 tracking-tighter leading-none font-semibold', className)} {...props}>
            {children}
        </div>
    );
};

const KpiCard: React.FC<React.HTMLAttributes<HTMLButtonElement>> = ({children, className, ...props}) => {
    return (
        <button
            className={
                cn(
                    'flex flex-col border-r border-border last:border-none items-start gap-6 px-6 py-5 transition-all',
                    props.onClick ? 'hover:bg-accent' : 'cursor-auto',
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
