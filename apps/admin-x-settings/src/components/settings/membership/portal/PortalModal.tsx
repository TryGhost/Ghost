import AccountPage from './AccountPage';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import LookAndFeel from './LookAndFeel';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import PortalPreview from './PortalPreview';
import React, {useState} from 'react';
import SignupOptions from './SignupOptions';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import useForm, {Dirtyable} from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';
import {Setting, SettingValue, useEditSettings} from '../../../../api/settings';
import {Tier, getPaidActiveTiers, useBrowseTiers, useEditTier} from '../../../../api/tiers';
import {fullEmailAddress} from '../../../../api/site';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const Sidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    localTiers: Tier[]
    updateTier: (tier: Tier) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({localSettings, updateSetting, localTiers, updateTier, errors, setError}) => {
    const [selectedTab, setSelectedTab] = useState('signupOptions');

    const tabs: Tab[] = [
        {
            id: 'signupOptions',
            title: 'Signup options',
            contents: <SignupOptions
                errors={errors}
                localSettings={localSettings}
                localTiers={localTiers}
                setError={setError}
                updateSetting={updateSetting}
                updateTier={updateTier}
            />
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
    const {updateRoute} = useRouting();

    const [selectedPreviewTab, setSelectedPreviewTab] = useState('signup');

    const {settings, siteData} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const tiers = getPaidActiveTiers(allTiers || []);

    const {mutateAsync: editTier} = useEditTier();

    const {formState, saveState, handleSave, updateForm} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            tiers: tiers as Dirtyable<Tier>[]
        },

        onSave: async () => {
            await Promise.all(formState.tiers.filter(({dirty}) => dirty).map(tier => editTier(tier)));

            const {meta, settings: currentSettings} = await editSettings(formState.settings.filter(setting => setting.dirty));

            if (meta?.sent_email_verification) {
                const newEmail = formState.settings.find(setting => setting.key === 'members_support_address')?.value;
                const currentEmail = currentSettings.find(setting => setting.key === 'members_support_address')?.value;

                NiceModal.show(ConfirmationModal, {
                    title: 'Confirm email address',
                    prompt: <>
                        We&apos;ve sent a confirmation email to <strong>{newEmail}</strong>.
                        Until verified, your support address will remain {fullEmailAddress(currentEmail?.toString() || 'noreply', siteData!)}.
                    </>,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            }
        }
    });

    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const updateSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({
            ...state,
            settings: state.settings.map(setting => (
                setting.key === key ? {...setting, value, dirty: true} : setting
            ))
        }));
    };

    const setError = (key: string, error: string | undefined) => {
        setErrors(state => ({
            ...state,
            [key]: error
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

    const sidebar = <Sidebar
        errors={errors}
        localSettings={formState.settings}
        localTiers={formState.tiers}
        setError={setError}
        updateSetting={updateSetting}
        updateTier={updateTier}
    />;
    const preview = <PortalPreview
        localSettings={formState.settings} localTiers={formState.tiers}
        selectedTab={selectedPreviewTab}
    />;

    let previewTabs: Tab[] = [
        {id: 'signup', title: 'Signup'},
        {id: 'account', title: 'Account page'},
        {id: 'links', title: 'Links'}
    ];
    let okLabel = 'Save & close';
    if (saveState === 'saving') {
        okLabel = 'Saving...';
    } else if (saveState === 'saved') {
        okLabel = 'Saved';
    }

    return <PreviewModalContent
        afterClose={() => {
            updateRoute('portal');
        }}
        deviceSelector={false}
        dirty={saveState === 'unsaved'}
        okLabel={okLabel}
        preview={preview}
        previewBgColor={selectedPreviewTab === 'links' ? 'white' : 'greygradient'}
        previewToolbarTabs={previewTabs}
        selectedURL={selectedPreviewTab}
        sidebar={sidebar}
        testId='portal-modal'
        title='Portal'
        onOk={async () => {
            if (!Object.values(errors).filter(Boolean).length) {
                await handleSave();
                updateRoute('portal');
                modal.remove();
            }
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(PortalModal);
