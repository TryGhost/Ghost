import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useRouting from '../../../hooks/useRouting';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design';

const History: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openHistoryModal = () => {
        updateRoute('history/view');
    };

    return (
        <TopLevelGroup
            customButtons={<Button color='green' label='View history' link linkWithPadding onClick={openHistoryModal}/>}
            description="View system event log"
            keywords={keywords}
            navid='history'
            testId='history'
            title="History"
        />
    );
};

export default withErrorBoundary(History, 'History');
