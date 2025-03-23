import clsx from 'clsx';
import React from 'react';

export interface ToggleGroupProps {
    children?: React.ReactNode;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * A simple container to group sequencing toggle switches
 */
const ToggleGroup: React.FC<ToggleGroupProps> = ({children, gap = 'md', className}) => {
    let gapClass = 'gap-3';
    switch (gap) {
    case 'sm':
        gapClass = 'gap-2';
        break;
    case 'md':
        gapClass = 'gap-3';
        break;
    case 'lg':
        gapClass = 'gap-4';
        break;

    default:
        break;
    }

    className = clsx(
        'flex flex-col',
        gapClass,
        className
    );

    return (
        <div className={className}>
            {children}
        </div>
    );
};

export default ToggleGroup;
