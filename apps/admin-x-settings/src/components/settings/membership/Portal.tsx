import Button from '../../../admin-x-ds/global/Button';
import NiceModal from '@ebay/nice-modal-react';
import PortalModal from './PortalModal';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const Portal: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const openPreviewModal = () => {
        NiceModal.show(PortalModal);
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
