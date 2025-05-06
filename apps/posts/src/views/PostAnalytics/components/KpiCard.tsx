import React from 'react';
import {cn} from '@tryghost/shade';

export const KpiCardIcon: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('flex size-11 rounded-full items-center justify-center bg-gray-200 text-blue-500 mb-2 [&_svg]:size-5', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('text-base text-gray-700 tracking-tight font-semibold', className)} {...props}>
            {children}
        </div>
    );
};

export const KpiCardValue: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('text-[23px] mt-0.5 tracking-tight leading-none font-semibold', className)} {...props}>
            {children}
        </div>
    );
};

const KpiCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div className={cn('rounded-md bg-muted/50 px-6 py-4', className)} {...props}>
            {children}
        </div>
    );
};

export default KpiCard;
