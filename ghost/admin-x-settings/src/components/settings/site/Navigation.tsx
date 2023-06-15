import Button from '../../../admin-x-ds/global/Button';
import NavigationModal from './NavigationModal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const Navigation: React.FC = () => {
    const openPreviewModal = () => {
        NiceModal.show(NavigationModal);
    };

    return (
        <SettingGroup
            customButtons={<Button color='green' label='Customize' link onClick={openPreviewModal}/>}
            description="Set up primary and secondary menus"
            navid='navigation'
            testId='navigation'
            title="Navigation"
        />
    );
};

export default Navigation;
