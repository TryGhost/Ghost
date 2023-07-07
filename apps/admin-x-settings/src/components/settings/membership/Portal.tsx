import Button from '../../../admin-x-ds/global/Button';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useRouting from '../../../hooks/useRouting';

const Portal: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openPreviewModal = () => {
        updateRoute('portal/edit');
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link onClick={openPreviewModal}/>}
            description="Customize members modal signup flow"
            keywords={keywords}
            navid='portal'
            testId='portal'
            title="Portal settings"
        />
    );
};

export default Portal;
