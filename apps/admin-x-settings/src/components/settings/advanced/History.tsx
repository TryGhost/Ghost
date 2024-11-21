import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const History: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openHistoryModal = () => {
        updateRoute('history/view');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' label='View history' size='sm' onClick={openHistoryModal}/>}
            description="View system event log"
            keywords={keywords}
            navid='history'
            testId='history'
            title="History"
        />
    );
};

export default withErrorBoundary(History, 'History');
