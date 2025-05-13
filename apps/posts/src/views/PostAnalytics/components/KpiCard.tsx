import React from 'react';
import {cn} from '@tryghost/shade';

export const KpiCardIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('flex size-11 rounded-full items-center justify-center bg-muted text-black mt-0.5 [&_svg]:size-5', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('flex flex-col', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('text-sm text-gray-800 font-medium', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardValue: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('text-[23px] mt-0.5 tracking-tighter leading-none font-semibold', className)} {...props}>
            {children}
        </div>
    );
};

const KpiCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('flex items-start gap-3 rounded-md border p-4', className)} {...props}>
            {children}
        </div>
    );
};

export default KpiCard;
