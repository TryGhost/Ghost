import * as React from 'react';
import {Button} from '@tryghost/shade';

interface subNavItemProps {}

const SubNavItem: React.FC<subNavItemProps> = () => {
    return (
        <Button className='flex justify-between' variant='ghost'>
            This is a button
        </Button>
    );
};

export default SubNavItem;
