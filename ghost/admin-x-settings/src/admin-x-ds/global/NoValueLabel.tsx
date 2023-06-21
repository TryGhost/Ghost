import Icon from './Icon';
import React from 'react';

interface NoValueLabelProps {
    icon?: string;
    children: React.ReactNode;
}

/**
 * Used for empty list and table indication
 */
const NoValueLabel: React.FC<NoValueLabelProps> = ({icon, children}) => {
    return (
        <div className='my-10 flex flex-col items-center gap-1 text-sm text-grey-600'>
            {icon && <Icon className='stroke-[1px]' colorClass='text-grey-500' name={icon} size='lg' />}
            {children}
        </div>
    );
};

export default NoValueLabel;