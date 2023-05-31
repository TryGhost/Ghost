import Button from '../../../admin-x-ds/global/Button';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal from '../../../admin-x-ds/global/PreviewModal';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const Design: React.FC = () => {
    const openPreviewModal = () => {
        NiceModal.show(PreviewModal, {
            title: 'Design',
            okLabel: 'Save',
            preview: 'Here we go',
            sidebar: 'And here too'
        });
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link onClick={openPreviewModal}/>}
            description="Customize your site and manage themes"
            title="Branding and design"
        >
            
        </SettingGroup>
    );
};

export default Design;