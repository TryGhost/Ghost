import AccountPage from './portal/AccountPage';
import LookAndFeel from './portal/LookAndFeel';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalPreview from './portal/PortalPreview';
import React, {useContext, useState} from 'react';
import SignupOptions from './portal/SignupOptions';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import useForm, {Dirtyable} from '../../../hooks/useForm';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {Setting, SettingValue, Tier} from '../../../types/api';
import {SettingsContext} from '../../providers/SettingsProvider';
import {useTiers} from '../../providers/ServiceProvider';

const Sidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    localTiers: Tier[]
    updateTier: (tier: Tier) => void
}> = ({localSettings, updateSetting, localTiers, updateTier}) => {
    const [selectedTab, setSelectedTab] = useState('signupOptions');

    const tabs: Tab[] = [
        {
            id: 'signupOptions',
            title: 'Signup options',
            contents: <SignupOptions localSettings={localSettings} localTiers={localTiers} updateSetting={updateSetting} updateTier={updateTier} />
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
    const {settings, saveSettings} = useContext(SettingsContext);
    const {data: tiers, update: updateTiers} = useTiers();

    const {formState, saveState, handleSave, updateForm} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            tiers: tiers as Dirtyable<Tier>[]
        },

        onSave: async () => {
            await updateTiers(formState.tiers.filter(tier => tier.dirty));
            await saveSettings(formState.settings.filter(setting => setting.dirty));
        }
    });

    const updateSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({
            ...state,
            settings: state.settings.map(setting => (
                setting.key === key ? {...setting, value, dirty: true} : setting
            ))
        }));
    };

    const updateTier = (newTier: Tier) => {
        updateForm(state => ({
            ...state,
            tiers: state.tiers.map(tier => (
                tier.id === newTier.id ? {...newTier, dirty: true} : tier
            ))
        }));
    };

    const onSelectURL = (id: string) => {
        setSelectedPreviewTab(id);
    };

    const sidebar = <Sidebar localSettings={formState.settings} localTiers={formState.tiers} updateSetting={updateSetting} updateTier={updateTier} />;
    const preview = <PortalPreview
        localSettings={formState.settings} localTiers={formState.tiers}
        selectedTab={selectedPreviewTab}
    />;

    let previewTabs: Tab[] = [
        {id: 'signup', title: 'Signup'},
        {id: 'account', title: 'Account page'},
        {id: 'links', title: 'Links'}
    ];

    return <PreviewModalContent
        deviceSelector={selectedPreviewTab !== 'links'}
        dirty={saveState === 'unsaved'}
        okLabel='Save & close'
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
