import React from 'react';
import Icon from '../icon';
import {Button} from '@tryghost/shade/components';

const GlobalActions: React.FC = () => {
    return (
        <Button aria-label='Search' size='icon' type='button' variant='ghost' onClick={() => {}}><Icon name='magnifying-glass' size='sm' /></Button>
    );
};

export default GlobalActions;
