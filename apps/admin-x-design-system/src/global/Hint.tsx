import clsx from 'clsx';
import React from 'react';

export interface HintProps {
    children?: React.ReactNode;
    color?: 'red' | 'green' | 'default' | '';
    className?: string;
}

const Hint: React.FC<HintProps> = ({children, color, className, ...props}) => {
    if (!children) {
        return null;
    }

    let colorClassName = 'text-grey-700 dark:text-grey-600';
    switch (color) {
    case 'red':
        colorClassName = 'text-red dark:text-red-500';
        break;
    case 'green':
        colorClassName = 'text-green dark:text-green-500';
        break;
    }

    className = clsx(
        'mt-1 inline-block text-xs leading-snug',
        colorClassName,
        className
    );

    return (
        <span className={className} {...props}>{children}</span>
    );
};

export default Hint;
