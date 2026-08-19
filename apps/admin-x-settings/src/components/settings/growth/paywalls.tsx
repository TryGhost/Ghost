import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button} from '@tryghost/shade/components';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const Paywalls: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' size='sm' type='button' variant='ghost' onClick={() => updateRoute('paywalls/edit')}>Customize</Button>}
            description='Set what readers see when a post stops short'
            keywords={keywords}
            navid='paywalls'
            testId='paywalls'
            title='Paywalls'
        />
    );
};

export default withErrorBoundary(Paywalls, 'Paywalls');
