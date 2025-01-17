import * as React from 'react';
import {Button, ButtonProps} from '@tryghost/shade';
import {cn} from '@tryghost/shade';

interface subNavItemProps extends ButtonProps {
    isActive: boolean;
}

const SubNavItem: React.FC<subNavItemProps> = ({isActive, ...props}) => {
    const subNavItemClasses = cn(
        'flex justify-between',
        isActive && 'bg-gray-100'
    );
    return (
        <Button className={subNavItemClasses} variant='ghost' {...props} />
    );
};

export default SubNavItem;
