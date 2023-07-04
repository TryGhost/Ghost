import AccountPage from './portal/AccountPage';
import LookAndFeel from './portal/LookAndFeel';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalPreview from './portal/PortalPreview';
import React, {useState} from 'react';
import SignupOptions from './portal/SignupOptions';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {Setting, SettingValue} from '../../../types/api';

const Sidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
}> = ({localSettings, updateSetting}) => {
    const [selectedTab, setSelectedTab] = useState('signupOptions');

    const tabs: Tab[] = [
        {
            id: 'signupOptions',
            title: 'Signup options',
            contents: <SignupOptions localSettings={localSettings} updateSetting={updateSetting} />
        },
        {
            id: 'lookAndFeel',
            title: 'Look & feel',
            contents: <LookAndFeel localSettings={localSettings} updateSetting={updateSetting} />
        },
        {
            id: 'accountPage',
            title: 'Account page',
            contents: <AccountPage localSettings={localSettings} updateSetting={updateSetting} />
        }
    ];

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
    };

    return (
        <div className='pt-4'>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
        </div>
    );
};

const PortalModal: React.FC = () => {
    const modal = useModal();

    const [selectedPreviewTab, setSelectedPreviewTab] = useState('signup');
    const {localSettings, updateSetting, handleSave, saveState} = useSettingGroup();

    const onSelectURL = (id: string) => {
        setSelectedPreviewTab(id);
    };

    const sidebar = <Sidebar localSettings={localSettings} updateSetting={updateSetting} />;
    const preview = <PortalPreview selectedTab={selectedPreviewTab} />;

    let previewTabs: Tab[] = [
        {id: 'signup', title: 'Signup'},
        {id: 'account', title: 'Account page'},
        {id: 'links', title: 'Links'}
    ];

    return <PreviewModalContent
        deviceSelector={selectedPreviewTab !== 'links'}
        dirty={saveState === 'unsaved'}
        preview={preview}
        previewToolbarTabs={previewTabs}
        selectedURL={selectedPreviewTab}
        sidebar={sidebar}
        testId='portal-modal'
        title='Portal'
        onOk={async () => {
            await handleSave();
            modal.remove();
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(PortalModal);
