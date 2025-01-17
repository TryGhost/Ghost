import * as React from 'react';
import {Button} from '@tryghost/shade';

interface subNavItemProps {
    children: React.ReactElement;
}

const SubNavItem: React.FC<subNavItemProps> = ({children}) => {
    return (
        <Button className='flex justify-between' variant='ghost'>
            {children}
        </Button>
    );
};

export default SubNavItem;
