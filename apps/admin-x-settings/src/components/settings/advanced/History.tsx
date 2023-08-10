import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';

const History: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openHistoryModal = () => {
        updateRoute('history/view');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='View history' link onClick={openHistoryModal}/>}
            description="View system event log"
            keywords={keywords}
            navid='history'
            testId='history'
            title="History"
        />
    );
};

export default History;
