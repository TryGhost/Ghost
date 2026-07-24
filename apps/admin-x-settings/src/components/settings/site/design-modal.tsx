import GlobalSettings, {type GlobalSettingValues} from './design-and-branding/global-settings';
import React, {useEffect, useState} from 'react';
import ThemePreview from './design-and-branding/theme-preview';
import ThemeSettings from './design-and-branding/theme-settings';
import useQueryParams from '../../../hooks/use-query-params';
import {type CustomThemeSetting, useBrowseCustomThemeSettings, useEditCustomThemeSettings} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import {Laptop, Smartphone} from 'lucide-react';
import {PreviewChrome, Tabs, TabsContent, TabsList, TabsTrigger, ToggleGroup, ToggleGroupItem} from '@tryghost/shade/components';
import {PreviewModalContent} from '../preview-modal';
import {type Setting, type SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '../../providers/global-data-provider';
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

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
        onTabChange(id);
    };

    return (
        <div className='flex h-full flex-col justify-between'>
            <div className='grow p-7 pt-0' data-testid="design-setting-tabs">
                {themeSettingSections.length > 0 ?
                    <Tabs value={selectedTab} variant='underline' onValueChange={handleTabChange}>
                        <TabsList className='sticky top-0 z-50 bg-surface-elevated-2'>
                            <TabsTrigger value='global'>Brand</TabsTrigger>
                            <TabsTrigger value='theme-settings'>Theme</TabsTrigger>
                        </TabsList>
                        <TabsContent value='global'><GlobalSettings updateSetting={updateGlobalSetting} values={globalSettings} /></TabsContent>
                        <TabsContent value='theme-settings'><ThemeSettings sections={themeSettingSections} updateSetting={updateThemeSetting} /></TabsContent>
                    </Tabs>
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
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
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

    const onSelectURL = (id: string) => {
        if (latestPost) {
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

    const rawPreviewContent =
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
    const previewContent = previewDevice === 'desktop' ? (
        <PreviewChrome data-testid='preview-desktop' device='desktop'>{rawPreviewContent}</PreviewChrome>
    ) : (
        <PreviewChrome data-testid='preview-mobile' device='mobile'>{rawPreviewContent}</PreviewChrome>
    );
    const previewTabs = latestPost ? (
        <Tabs value={selectedPreviewTab} variant='button-sm' onValueChange={onSelectURL}>
            <TabsList>
                <TabsTrigger value='homepage'>Homepage</TabsTrigger>
                <TabsTrigger value='post'>Post</TabsTrigger>
            </TabsList>
        </Tabs>
    ) : undefined;
    const deviceSelector = (
        <ToggleGroup type='single' value={previewDevice} onValueChange={(value) => {
            if (value === 'desktop' || value === 'mobile') {
                setPreviewDevice(value);
            }
        }}>
            <ToggleGroupItem aria-label='Desktop' value='desktop'><Laptop /></ToggleGroupItem>
            <ToggleGroupItem aria-label='Mobile' value='mobile'><Smartphone /></ToggleGroupItem>
        </ToggleGroup>
    );
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
                updateRoute({isExternal: true, route: 'analytics'});
            } else {
                updateRoute('design');
            }
        }}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        deviceSelector={deviceSelector}
        dirty={saveState === 'unsaved'}
        okLabel={okProps.label || 'Save'}
        okVariant={okProps.variant}
        preview={previewContent}
        previewToolbarTabs={previewTabs}
        sidebar={sidebarContent}
        sidebarPadding={false}
        siteLink={getHomepageUrl(siteData!)}
        size='full'
        testId='design-modal'
        title='Design'
        onOk={async () => {
            await handleSave({fakeWhenUnchanged: true});
        }}
    />;
};

export default DesignModal;
