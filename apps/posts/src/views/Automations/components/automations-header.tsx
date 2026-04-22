import React from 'react';
import {ListHeader} from '@tryghost/shade/primitives';

const AutomationsHeader: React.FC = () => {
    return (
        <ListHeader className='py-4 sidebar:py-6'>
            <ListHeader.Left>
                <ListHeader.Title>Automations</ListHeader.Title>
            </ListHeader.Left>
        </ListHeader>
    );
};

export default AutomationsHeader;
