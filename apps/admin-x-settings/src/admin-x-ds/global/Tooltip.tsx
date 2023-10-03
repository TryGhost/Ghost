import React from 'react';
import clsx from 'clsx';

interface TooltipProps {
    content?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({content, children, className}) => {
    className = clsx(
        'group/tooltip relative',
        className
    );

    return (
        <span className={className}>
            {children}
            <span className='invisible group-hover/tooltip:visible'>{content}</span>
        </span>
    );
};

export default Tooltip;