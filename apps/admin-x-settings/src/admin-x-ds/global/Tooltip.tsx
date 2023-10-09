import React from 'react';
import clsx from 'clsx';

interface TooltipProps {
    content?: React.ReactNode;
    size?: 'sm' | 'md';
    children?: React.ReactNode;
    containerClassName?: string;
    tooltipClassName?: string;
    origin?: 'right' | 'center' | 'left'
}

const Tooltip: React.FC<TooltipProps> = ({content, size = 'sm', children, containerClassName, tooltipClassName, origin = 'center'}) => {
    containerClassName = clsx(
        'group/tooltip relative',
        containerClassName
    );

    tooltipClassName = clsx(
        'absolute -mt-1 -translate-y-full whitespace-nowrap rounded-sm bg-black px-2 py-0.5 leading-normal text-white opacity-0 transition-all group-hover/tooltip:opacity-100 dark:bg-grey-950',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        origin === 'center' && 'left-1/2 -translate-x-1/2',
        origin === 'left' && 'left-0',
        origin === 'right' && 'right-0'
    );

    return (
        <span className={containerClassName}>
            {children}
            <span className={tooltipClassName}>{content}</span>
        </span>
    );
};

export default Tooltip;