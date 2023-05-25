import Icon from './Icon';
import React from 'react';

interface IconLabelProps {
    icon: string;
    iconColor?: string;
    children?: React.ReactNode;
}

const IconLabel: React.FC<IconLabelProps> = ({icon, iconColor, children}) => {
    return (
        <div className='flex items-center gap-2'>
            <Icon color={iconColor} name={icon} size='sm' />
            {children}
        </div>
    );
};

export default IconLabel;