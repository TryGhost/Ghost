import Button from '../../../admin-x-ds/global/Button';
import DesignModal from './DesignModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const DesignSetting: React.FC = () => {
    const openPreviewModal = () => {
        NiceModal.show(DesignModal);
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link onClick={openPreviewModal}/>}
            description="Customize your site and manage themes"
            navid='branding-and-design'
            title="Branding and design"
        />
    );
};

export default DesignSetting;
