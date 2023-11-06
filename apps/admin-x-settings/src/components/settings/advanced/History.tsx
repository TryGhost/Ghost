import React from 'react';
import useRouting from '../../../hooks/useRouting';
import {Button, SettingGroup, withErrorBoundary} from '@tryghost/admin-x-design';

const History: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openHistoryModal = () => {
        updateRoute('history/view');
    };

    return (
        <SettingGroup
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
