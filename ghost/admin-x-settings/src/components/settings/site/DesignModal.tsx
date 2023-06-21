import BrandSettings, {BrandSettingValues} from './designAndBranding/BrandSettings';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useContext, useEffect, useState} from 'react';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import ThemePreview from './designAndBranding/ThemePreview';
import ThemeSettings from './designAndBranding/ThemeSettings';
import useForm from '../../../hooks/useForm';
import {CustomThemeSetting, Post, Setting, SettingValue} from '../../../types/api';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {ServicesContext} from '../../providers/ServiceProvider';
import {SettingsContext} from '../../providers/SettingsProvider';
import {getHomepageUrl, getSettingValues} from '../../../utils/helpers';

const Sidebar: React.FC<{
    brandSettings: BrandSettingValues
    updateBrandSetting: (key: string, value: SettingValue) => void
    themeSettingSections: Array<{id: string, title: string, settings: CustomThemeSetting[]}>
    updateThemeSetting: (updated: CustomThemeSetting) => void
    onTabChange: (id: string) => void
}> = ({
    brandSettings,
    updateBrandSetting,
    themeSettingSections,
    updateThemeSetting,
    onTabChange
}) => {
    const tabs: Tab[] = [
        {
            id: 'brand',
            title: 'Brand',
            contents: <BrandSettings updateSetting={updateBrandSetting} values={brandSettings} />
        },
        ...themeSettingSections.map(({id, title, settings}) => ({
            id,
            title,
            contents: <ThemeSettings settings={settings} updateSetting={updateThemeSetting} />
        }))
    ];

    return (
        <>
            <div className='p-7'>
                <TabView tabs={tabs} onTabChange={onTabChange} />
            </div>
        </>
    );
};

const DesignModal: React.FC = () => {
    const modal = useModal();

    const {api} = useContext(ServicesContext);
    const {settings, siteData, saveSettings} = useContext(SettingsContext);
    const [themeSettings, setThemeSettings] = useState<Array<CustomThemeSetting>>([]);
    const [latestPost, setLatestPost] = useState<Post | null>(null);
    const [selectedPreviewTab, setSelectedPreviewTab] = useState('home');

    useEffect(() => {
        api.customThemeSettings.browse().then((response) => {
            setThemeSettings(response.custom_theme_settings);
        });
    }, [api]);

    useEffect(() => {
        api.latestPost.browse().then((response) => {
            setLatestPost(response.posts[0]);
        });
    }, [api]);

    const {
        formState,
        saveState,
        handleSave,
        updateForm
    } = useForm({
        initialState: {
            settings: settings as Array<Setting & { dirty?: boolean }>,
            themeSettings: themeSettings as Array<CustomThemeSetting & { dirty?: boolean }>
        },
        onSave: async () => {
            if (formState.themeSettings.some(setting => setting.dirty)) {
                const response = await api.customThemeSettings.edit(formState.themeSettings);
                setThemeSettings(response.custom_theme_settings);
                updateForm(state => ({...state, themeSettings: response.custom_theme_settings}));
            }

            if (formState.settings.some(setting => setting.dirty)) {
                const newSettings = await saveSettings(formState.settings.filter(setting => setting.dirty));
                updateForm(state => ({...state, settings: newSettings}));
            }
        }
    });

    const updateBrandSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({...state, settings: state.settings.map(setting => (
            setting.key === key ? {...setting, value, dirty: true} : setting
        ))}));
    };

    const updateThemeSetting = (updated: CustomThemeSetting) => {
        updateForm(state => ({...state, themeSettings: themeSettings.map(setting => (
            setting.key === updated.key ? {...updated, dirty: true} : setting
        ))}));
    };

    const [description, accentColor, icon, logo, coverImage] = getSettingValues(formState.settings, ['description', 'accent_color', 'icon', 'logo', 'cover_image']) as string[];

    const themeSettingGroups = themeSettings.reduce((groups, setting) => {
        const group = (setting.group === 'homepage' || setting.group === 'post') ? setting.group : 'site-wide';

        return {
            ...groups,
            [group]: (groups[group] || []).concat(setting)
        };
    }, {} as {[key: string]: CustomThemeSetting[] | undefined});

    const themeSettingSections = Object.entries(themeSettingGroups).map(([id, group]) => ({
        id,
        settings: group || [],
        title: id === 'site-wide' ? 'Site wide' : (id === 'homepage' ? 'Homepage' : 'Post')
    }));

    let previewTabs: Tab[] = [];
    if (latestPost) {
        previewTabs = [
            {id: 'homepage', title: 'Homepage'},
            {id: 'post', title: 'Post'}
        ];
    }

    const onSelectURL = (id: string) => {
        if (previewTabs.length) {
            setSelectedPreviewTab(id);
        }
    };

    const onTabChange = (id: string) => {
        if (id === 'post' && latestPost) {
            setSelectedPreviewTab('post');
        } else {
            setSelectedPreviewTab('home');
        }
    };

    let selectedTabURL = getHomepageUrl(siteData!);
    switch (selectedPreviewTab) {
    case 'homepage':
        selectedTabURL = getHomepageUrl(siteData!);
        break;
    case 'post':
        selectedTabURL = latestPost!.url;
        break;
    }

    const previewContent =
        <ThemePreview
            settings={{
                description,
                accentColor,
                icon,
                logo,
                coverImage,
                themeSettings
            }}
            url={selectedTabURL}
        />;
    const sidebarContent =
        <Sidebar
            brandSettings={{description, accentColor, icon, logo, coverImage}}
            themeSettingSections={themeSettingSections}
            updateBrandSetting={updateBrandSetting}
            updateThemeSetting={updateThemeSetting}
            onTabChange={onTabChange}
        />;

    return <PreviewModalContent
        buttonsDisabled={saveState === 'saving'}
        defaultTab='homepage'
        okLabel={saveState === 'saved' ? 'Saved' : (saveState === 'saving' ? 'Saving...' : 'Save and close')}
        preview={previewContent}
        previewToolbarTabs={previewTabs}
        sidebar={sidebarContent}
        sidebarPadding={false}
        size='full'
        testId='design-modal'
        title='Design'
        onCancel={() => {
            if (saveState === 'unsaved') {
                NiceModal.show(ConfirmationModal, {
                    title: 'Are you sure you want to leave this page?',
                    prompt: (
                        <>
                            <p>Hey there! It looks like you didn&lsquo;t save the changes you made.</p>
                            <p>Save before you go!</p>
                        </>
                    ),
                    okLabel: 'Leave',
                    okColor: 'red',
                    onOk: (confirmModal) => {
                        confirmModal?.remove();
                        modal.remove();
                    },
                    cancelLabel: 'Stay'
                });
            } else {
                modal.remove();
            }
        }}
        onOk={async () => {
            await handleSave();
            modal.remove();
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(DesignModal);
