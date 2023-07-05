import BrandSettings, {BrandSettingValues} from './designAndBranding/BrandSettings';
import Button from '../../../admin-x-ds/global/Button';
import ChangeThemeModal from './ThemeModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useContext, useEffect, useState} from 'react';
import StickyFooter from '../../../admin-x-ds/global/StickyFooter';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import ThemePreview from './designAndBranding/ThemePreview';
import ThemeSettings from './designAndBranding/ThemeSettings';
import useForm from '../../../hooks/useForm';
import useRouting from '../../../hooks/useRouting';
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
    const [selectedTab, setSelectedTab] = useState('brand');

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

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
        onTabChange(id);
    };

    return (
        <div className='flex h-full flex-col justify-between'>
            <div className='p-7' data-testid="design-setting-tabs">
                <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
            </div>
            <StickyFooter height={74}>
                <div className='px-7'>
                    <Button label='Change theme' link onClick={() => {
                        NiceModal.show(ChangeThemeModal);
                    }
                    } />
                </div>
            </StickyFooter>
        </div>
    );
};

const DesignModal: React.FC = () => {
    const modal = useModal();

    const {api} = useContext(ServicesContext);
    const {settings, siteData, saveSettings} = useContext(SettingsContext);
    const [themeSettings, setThemeSettings] = useState<Array<CustomThemeSetting>>([]);
    const [latestPost, setLatestPost] = useState<Post | null>(null);
    const [selectedPreviewTab, setSelectedPreviewTab] = useState('homepage');
    const {updateRoute} = useRouting();

    useEffect(() => {
        api.latestPost.browse().then((response) => {
            setLatestPost(response.posts[0]);
        });
    }, [api]);

    const {
        formState,
        saveState,
        handleSave,
        updateForm,
        setFormState
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

    useEffect(() => {
        api.customThemeSettings.browse().then((response) => {
            setThemeSettings(response.custom_theme_settings);
            setFormState(state => ({...state, themeSettings: response.custom_theme_settings}));
        });
    }, [api, updateForm, setFormState]);

    const updateBrandSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({...state, settings: state.settings.map(setting => (
            setting.key === key ? {...setting, value, dirty: true} : setting
        ))}));
    };

    const updateThemeSetting = (updated: CustomThemeSetting) => {
        updateForm(state => ({...state, themeSettings: state.themeSettings.map(setting => (
            setting.key === updated.key ? {...updated, dirty: true} : setting
        ))}));
    };

    const [description, accentColor, icon, logo, coverImage] = getSettingValues(formState.settings, ['description', 'accent_color', 'icon', 'logo', 'cover_image']) as string[];

    const themeSettingGroups = formState.themeSettings.reduce((groups, setting) => {
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
            setSelectedPreviewTab('homepage');
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
                themeSettings: formState.themeSettings
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
        afterClose={() => {
            updateRoute('branding-and-design');
        }}
        buttonsDisabled={saveState === 'saving'}
        defaultTab='homepage'
        dirty={saveState === 'unsaved'}
        okLabel={saveState === 'saved' ? 'Saved' : (saveState === 'saving' ? 'Saving...' : 'Save and close')}
        preview={previewContent}
        previewToolbarTabs={previewTabs}
        selectedURL={selectedPreviewTab}
        sidebar={sidebarContent}
        sidebarPadding={false}
        size='bleed'
        testId='design-modal'
        title='Design'
        onOk={async () => {
            await handleSave();
            modal.remove();
            updateRoute('branding-and-design');
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(DesignModal);
