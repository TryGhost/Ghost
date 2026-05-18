import React from 'react';
import {LucideIcon} from 'lucide-react';

interface NoValueLabelProps {
    className?: string;
    children: React.ReactNode;
}

const NoValueLabel: React.FC<NoValueLabelProps> = ({className = '', children}) => {
    return (
        <div className={`my-10 flex flex-col items-center gap-1 text-sm text-text-secondary ${className}`}>
            {children}
        </div>
    );
};

interface NoValueLabelIconProps {
    className?: string;
    children: React.ReactElement<React.ComponentProps<LucideIcon>>;
}

const NoValueLabelIcon: React.FC<NoValueLabelIconProps> = ({className = '', children}) => {
    return (
        <div className={`text-text-tertiary [&>svg]:size-8 [&>svg]:stroke-[1px] ${className}`}>
            {children}
        </div>
    );
};

export {
    NoValueLabel,
    NoValueLabelIcon
};
