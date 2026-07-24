import AccountPage from './account-page';
import ConfirmationModal from '../../../confirmation-modal';
import LookAndFeel from './look-and-feel';
import NiceModal from '@ebay/nice-modal-react';
import PortalPreview from './portal-preview';
import React, {useEffect, useState} from 'react';
import SignupOptions from './signup-options';
import useQueryParams from '../../../../hooks/use-query-params';
import {type Dirtyable, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {PreviewModalContent} from '../../preview-modal';
import {type Setting, type SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {type Tier, useBrowseTiers, useEditTier} from '@tryghost/admin-x-framework/api/tiers';
import {fullEmailAddress} from '@tryghost/admin-x-framework/api/site';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {verifyEmailToken} from '@tryghost/admin-x-framework/api/email-verification';

type PreviewTab = 'signup' | 'account' | 'links';
type SidebarTab = 'signupOptions' | 'lookAndFeel' | 'accountPage';

const previewTabForSidebar: Record<SidebarTab, PreviewTab> = {
    signupOptions: 'signup',
    lookAndFeel: 'signup',
    accountPage: 'account'
};

const portalSidebarTabClassName = 'border-b-2 border-transparent after:hidden data-[state=active]:border-foreground';

const Sidebar: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    localTiers: Tier[]
    updateTier: (tier: Tier) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
    selectedTab: SidebarTab
    onTabChange: (id: SidebarTab) => void
}> = ({localSettings, updateSetting, localTiers, updateTier, errors, setError, selectedTab, onTabChange}) => {
    return (
        <div className='pt-4'>
            <Tabs value={selectedTab} variant='underline' onValueChange={value => onTabChange(value as SidebarTab)}>
                <TabsList>
                    <TabsTrigger className={portalSidebarTabClassName} value='signupOptions'>Signup options</TabsTrigger>
                    <TabsTrigger className={portalSidebarTabClassName} value='lookAndFeel'>Look & feel</TabsTrigger>
                    <TabsTrigger className={portalSidebarTabClassName} value='accountPage'>Account page</TabsTrigger>
                </TabsList>
                <TabsContent value='signupOptions'>
                    <SignupOptions
                        errors={errors}
                        localSettings={localSettings}
                        localTiers={localTiers}
                        setError={setError}
                        updateSetting={updateSetting}
                        updateTier={updateTier}
                    />
                </TabsContent>
                <TabsContent value='lookAndFeel'><LookAndFeel localSettings={localSettings} updateSetting={updateSetting} /></TabsContent>
                <TabsContent value='accountPage'><AccountPage errors={errors} localSettings={localSettings} setError={setError} updateSetting={updateSetting} /></TabsContent>
            </Tabs>
        </div>
    );
};

const PortalModal: React.FC = () => {
    const {updateRoute} = useRouting();

    const [selectedPreviewTab, setSelectedPreviewTab] = useState<PreviewTab>('signup');
    const [selectedSidebarTab, setSelectedSidebarTab] = useState<SidebarTab>('signupOptions');

    const handleError = useHandleError();
    const {settings, siteData, config} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    // const tiers = getPaidActiveTiers(allTiers || []);

    const {mutateAsync: editTier} = useEditTier();
    const {mutateAsync: verifyToken} = verifyEmailToken();

    const {getParam} = useQueryParams();

    const verifyEmail = getParam('verifyEmail');

    useEffect(() => {
        const checkToken = async ({token}: {token: string}) => {
            try {
                const {settings: verifiedSettings} = await verifyToken({token});
                const [supportEmail] = getSettingValues<string>(verifiedSettings, ['members_support_address']);
                NiceModal.show(ConfirmationModal, {
                    title: 'Support address verified',
                    prompt: <>Your support email address has been changed to <strong>{supportEmail}</strong>.</>,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (e: any) {
                let prompt = 'There was an error verifying your email address. Please try again.';

                if (e?.message === 'Token expired') {
                    prompt = 'Verification link has expired.';
                }
                NiceModal.show(ConfirmationModal, {
                    title: 'Error verifying support address',
                    prompt: prompt,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
                handleError(e, {withToast: false});
            }
        };
        if (verifyEmail) {
            checkToken({token: verifyEmail});
        }
    }, [handleError, verifyEmail, verifyToken]);

    const {formState, setFormState, saveState, handleSave, updateForm, okProps} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            tiers: allTiers as Dirtyable<Tier>[] || []
        },

        savingDelay: 500,

        onSave: async () => {
            await Promise.all(formState.tiers.filter(({dirty}) => dirty).map(tier => editTier(tier)));
            setFormState(state => ({...state, tiers: formState.tiers.map(tier => ({...tier, dirty: false}))}));

            const changedSettings = formState.settings.filter(setting => setting.dirty);

            if (!changedSettings.length) {
                return;
            }

            const {meta, settings: currentSettings} = await editSettings(changedSettings);
            setFormState(state => ({...state, settings: formState.settings.map(setting => ({...setting, dirty: false}))}));

            if (meta?.sent_email_verification) {
                const newEmail = formState.settings.find(setting => setting.key === 'members_support_address')?.value;
                const currentEmail = currentSettings.find(setting => setting.key === 'support_email_address')?.value ||
                    fullEmailAddress(currentSettings.find(setting => setting.key === 'members_support_address')?.value?.toString() || 'noreply', siteData!, config);

                NiceModal.show(ConfirmationModal, {
                    title: 'Confirm email address',
                    prompt: <>
                        We&apos;ve sent a confirmation email to <strong>{newEmail}</strong>.
                        Until verified, your support email address will remain {currentEmail}.
                    </>,
                    okLabel: 'Close',
                    cancelLabel: '',
                    onOk: confirmModal => confirmModal?.remove()
                });
            }
        },

        onSaveError: handleError
    });

    useEffect(() => {
        if (!formState.tiers.length && allTiers?.length) {
            setFormState(state => ({...state, tiers: allTiers}));
        }
    }, [allTiers, formState.tiers, setFormState]);

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

    const onSelectURL = (id: PreviewTab) => {
        setSelectedPreviewTab(id);

        if (id === 'account') {
            setSelectedSidebarTab('accountPage');
        } else if (id === 'signup' && selectedSidebarTab === 'accountPage') {
            setSelectedSidebarTab('signupOptions');
        }
    };

    const onSidebarTabChange = (id: SidebarTab) => {
        setSelectedSidebarTab(id);
        setSelectedPreviewTab(previewTabForSidebar[id]);
    };

    const sidebar = <Sidebar
        errors={errors}
        localSettings={formState.settings}
        localTiers={formState.tiers}
        selectedTab={selectedSidebarTab}
        setError={setError}
        updateSetting={updateSetting}
        updateTier={updateTier}
        onTabChange={onSidebarTabChange}
    />;
    const preview = <PortalPreview
        localSettings={formState.settings}
        localTiers={formState.tiers}
        selectedTab={selectedPreviewTab}
    />;

    const previewTabs = (
        <Tabs value={selectedPreviewTab} variant='button-sm' onValueChange={value => onSelectURL(value as PreviewTab)}>
            <TabsList>
                <TabsTrigger value='signup'>Signup</TabsTrigger>
                <TabsTrigger value='account'>Account page</TabsTrigger>
                <TabsTrigger value='links'>Links</TabsTrigger>
            </TabsList>
        </Tabs>
    );

    return <PreviewModalContent
        afterClose={() => {
            updateRoute('portal');
        }}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        dirty={saveState === 'unsaved'}
        okLabel={okProps.label || 'Save'}
        okVariant={okProps.variant}
        preview={preview}
        previewBgColor={selectedPreviewTab === 'links' ? 'white' : 'greygradient'}
        previewToolbarTabs={previewTabs}
        sidebar={sidebar}
        testId='portal-modal'
        title='Portal'
        onOk={async () => {
            if (!Object.values(errors).filter(Boolean).length) {
                await handleSave({force: true});
            }
        }}
    />;
};

export default NiceModal.create(PortalModal);
