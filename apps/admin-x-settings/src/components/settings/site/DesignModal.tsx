import GlobalSettings, {GlobalSettingValues} from './designAndBranding/GlobalSettings';
import React, {useEffect, useState} from 'react';
import ThemePreview from './designAndBranding/ThemePreview';
import ThemeSettings from './designAndBranding/ThemeSettings';
import useQueryParams from '../../../hooks/useQueryParams';
import {CustomThemeSetting, useBrowseCustomThemeSettings, useEditCustomThemeSettings} from '@tryghost/admin-x-framework/api/customThemeSettings';
import {PreviewModalContent, Tab, TabView} from '@tryghost/admin-x-design-system';
import {Setting, SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Sidebar: React.FC<{
    globalSettings: GlobalSettingValues
    themeSettingSections: Array<{id: string, title: string, settings: CustomThemeSetting[]}>
    updateGlobalSetting: (key: string, value: SettingValue) => void
    updateThemeSetting: (updated: CustomThemeSetting) => void
    onTabChange: (id: string) => void
    handleSave: () => Promise<boolean>
}> = ({
    globalSettings,
    themeSettingSections,
    updateGlobalSetting,
    updateThemeSetting,
    onTabChange
}) => {
    const [selectedTab, setSelectedTab] = useState('global');

    const tabs: Tab[] = [
        {
            id: 'global',
            title: 'Global',
            contents: <GlobalSettings updateSetting={updateGlobalSetting} values={globalSettings} />
        }
    ];

    if (themeSettingSections.length > 0) {
        tabs.push({
            id: 'theme-settings',
            title: 'Theme settings',
            contents: <ThemeSettings sections={themeSettingSections} updateSetting={updateThemeSetting} />
        });
    }

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
        onTabChange(id);
    };

    return (
        <div className='flex h-full flex-col justify-between'>
            <div className='grow p-7 pt-2' data-testid="design-setting-tabs">
                {tabs.length > 1 ?
                    <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
                    :
                    <GlobalSettings updateSetting={updateGlobalSetting} values={globalSettings} />
                }
            </div>
        </div>
    );
};

const DesignModal: React.FC = () => {
    const {settings, siteData} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {posts: [latestPost]} = {posts: []}} = useBrowsePosts({
        searchParams: {
            filter: 'status:published',
            order: 'published_at DESC',
            limit: '1',
            fields: 'id,url'
        }
    });
    const {data: themeSettings} = useBrowseCustomThemeSettings();
    const {mutateAsync: editThemeSettings} = useEditCustomThemeSettings();
    const handleError = useHandleError();
    const [selectedPreviewTab, setSelectedPreviewTab] = useState('homepage');
    const {updateRoute} = useRouting();

    const refParam = useQueryParams().getParam('ref');

    const {
        formState,
        saveState,
        handleSave,
        updateForm,
        setFormState,
        okProps
    } = useForm({
        initialState: {
            settings: settings as Array<Setting & { dirty?: boolean }>,
            themeSettings: themeSettings ? (themeSettings.custom_theme_settings as Array<CustomThemeSetting & { dirty?: boolean }>) : undefined
        },
        savingDelay: 500,
        onSave: async () => {
            if (formState.themeSettings?.some(setting => setting.dirty)) {
                const response = await editThemeSettings(formState.themeSettings);
                setFormState(state => ({...state, themeSettings: response.custom_theme_settings}));
            }

            if (formState.settings.some(setting => setting.dirty)) {
                const {settings: newSettings} = await editSettings(formState.settings.filter(setting => setting.dirty));
                setFormState(state => ({...state, settings: newSettings}));
            }
        },
        onSaveError: handleError
    });

    useEffect(() => {
        if (themeSettings) {
            setFormState(state => ({...state, themeSettings: themeSettings.custom_theme_settings}));
        }
    }, [setFormState, themeSettings]);

    const updateGlobalSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({...state, settings: state.settings.map(setting => (
            setting.key === key ? {...setting, value, dirty: true} : setting
        ))}));
    };

    const updateThemeSetting = (updated: CustomThemeSetting) => {
        updateForm(state => ({...state, themeSettings: state.themeSettings?.map(setting => (
            setting.key === updated.key ? {...updated, dirty: true} : setting
        ))}));
    };

    const [description, accentColor, icon, logo, coverImage, headingFont, bodyFont] = getSettingValues(formState.settings, ['description', 'accent_color', 'icon', 'logo', 'cover_image', 'heading_font', 'body_font']) as string[];

    const themeSettingGroups = (formState.themeSettings || []).reduce((groups, setting) => {
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
                themeSettings: formState.themeSettings,
                headingFont,
                bodyFont
            }}
            url={selectedTabURL}
        />;
    const sidebarContent =
        <Sidebar
            globalSettings={{description, accentColor, icon, logo, coverImage, headingFont, bodyFont}}
            handleSave={handleSave}
            themeSettingSections={themeSettingSections}
            updateGlobalSetting={updateGlobalSetting}
            updateThemeSetting={updateThemeSetting}
            onTabChange={onTabChange}
        />;

    return <PreviewModalContent
        afterClose={() => {
            if (refParam === 'setup') {
                window.location.hash = '/dashboard/';
            } else {
                updateRoute('design');
            }
        }}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        defaultTab='homepage'
        dirty={saveState === 'unsaved'}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        preview={previewContent}
        previewToolbarTabs={previewTabs}
        selectedURL={selectedPreviewTab}
        sidebar={sidebarContent}
        sidebarPadding={false}
        siteLink={getHomepageUrl(siteData!)}
        size='full'
        testId='design-modal'
        title='Design'
        onOk={async () => {
            await handleSave({fakeWhenUnchanged: true});
        }}
        onSelectURL={onSelectURL}
    />;
};

export default DesignModal;
