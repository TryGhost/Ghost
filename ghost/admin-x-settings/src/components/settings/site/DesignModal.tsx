import BrandSettings from './designAndBranding/BrandSettings';
import Button from '../../../admin-x-ds/global/Button';
import NiceModal from '@ebay/nice-modal-react';
import PreviewModal from '../../../admin-x-ds/global/PreviewModal';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import ThemePreview from './designAndBranding/ThemePreivew';
import ThemeSettings from './designAndBranding/ThemeSettings';
import {Tab} from '../../../admin-x-ds/global/TabView';

const Sidebar: React.FC = () => {
    const tabs: Tab[] = [
        {
            id: 'brand',
            title: 'Brand',
            contents: <BrandSettings />
        },
        {
            id: 'site-wide',
            title: 'Site wide',
            contents: <ThemeSettings settingSection='site-wide' />
        },
        {
            id: 'homepage',
            title: 'Homepage',
            contents: <ThemeSettings settingSection='homepage' />
        },
        {
            id: 'post',
            title: 'Post',
            contents: <ThemeSettings settingSection='post' />
        }
    ];

    return (
        <TabView tabs={tabs} />
    );
};

const DesignModal: React.FC = () => {
    const openPreviewModal = () => {
        NiceModal.show(PreviewModal, {
            title: 'Design',
            okLabel: 'Save',
            preview: <ThemePreview />,
            sidebar: <Sidebar />
        });
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

export default DesignModal;