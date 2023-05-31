import Button from '../../../admin-x-ds/global/Button';
import DesktopChrome from '../../../admin-x-ds/global/DesktopChrome';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal from '../../../admin-x-ds/global/PreviewModal';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';

const Preview: React.FC = () => {
    return (
        <>
            <DesktopChrome>
                <div className='flex h-full items-center justify-center text-sm text-grey-400'>
                    Preview iframe
                </div>
            </DesktopChrome>
        </>
    );
};

const Design: React.FC = () => {
    const openPreviewModal = () => {
        NiceModal.show(PreviewModal, {
            title: 'Design',
            okLabel: 'Save',
            preview: (<Preview />),
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