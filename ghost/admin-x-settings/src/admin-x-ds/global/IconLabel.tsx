import Icon from './Icon';
import React from 'react';

interface IconLabelProps {
    icon: string;
    iconColorClass?: string;
    children?: React.ReactNode;
}

const IconLabel: React.FC<IconLabelProps> = ({icon, iconColorClass, children}) => {
    return (
        <div className='flex items-center gap-2'>
            <Icon colorClass={iconColorClass} name={icon} size='sm' />
            {children}
        </div>
    );
};

export default IconLabel;