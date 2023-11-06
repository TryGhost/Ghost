import Button from '@tryghost/admin-x-design/global/Button';
import React from 'react';
import SettingGroup from '@tryghost/admin-x-design/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';
import {withErrorBoundary} from '@tryghost/admin-x-design/global/ErrorBoundary';

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
