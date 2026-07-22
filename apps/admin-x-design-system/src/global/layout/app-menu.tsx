import React from 'react';
import Icon from '../icon';
import {Button} from '@tryghost/shade/components';

const PageMenu: React.FC = () => {
    return (
        <Button aria-label='Open app menu' size='icon' type='button' variant='ghost' onClick={() => {
            alert('Clicked on hamburger');
        }}><Icon name='hamburger' size='sm' /></Button>
    );
};

export default PageMenu;
