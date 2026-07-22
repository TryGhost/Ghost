import React from 'react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

const PageMenu: React.FC = () => {
    return (
        <Button aria-label='Open app menu' size='icon' type='button' variant='ghost' onClick={() => {
            alert('Clicked on hamburger');
        }}><LucideIcon.Menu /></Button>
    );
};

export default PageMenu;
