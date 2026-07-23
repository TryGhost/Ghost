import React from 'react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';

const GlobalActions: React.FC = () => {
    return (
        <Button aria-label='Search' size='icon' type='button' variant='ghost' onClick={() => {}}><LucideIcon.Search /></Button>
    );
};

export default GlobalActions;
