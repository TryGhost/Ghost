import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import {
    type CustomThemeSetting,
    hiddenCustomThemeSettingValue,
    useBrowseCustomThemeSettings,
    useEditCustomThemeSettings,
} from "@tryghost/admin-x-framework/api/custom-theme-settings";
import { type Setting, type SettingValue, getSettingValues, useBrowseSettings, useEditSettings } from "@tryghost/admin-x-framework/api/settings";
import { getHomepageUrl, useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useBrowsePosts } from "@tryghost/admin-x-framework/api/posts";
import { useForm } from "@tryghost/admin-x-framework/hooks";
import { useLocation, useNavigate } from "@tryghost/admin-x-framework";
import { isCustomThemeSettingVisible } from "@tryghost/admin-x-settings/src/utils/is-custom-theme-settings-visible";

import { BrandSettings } from "./brand-settings";
import { type PreviewDevice, PreviewDialog } from "./preview-chrome";
import { SitePreviewFrame } from "./site-preview-frame";
import { type ThemeSettingSection, ThemeSettingsForm } from "./theme-settings-form";
import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";
import { useSettingsHandleError } from "@/settings/app/shared/toast";

/**
 * The routed design & branding dialog (`/settings/design/edit`), ported from
 * the legacy design-modal.tsx: brand + theme-specific settings on the left
 * preview, Close confirms discarding unsaved changes, Save writes both the
 * settings and custom theme settings that are dirty.
 */

type DirtySetting = Setting & { dirty?: boolean };
type DirtyThemeSetting = CustomThemeSetting & { dirty?: boolean };

function getPreviewData({ settings, themeSettings }: {
    settings: DirtySetting[];
    themeSettings: DirtyThemeSetting[] | undefined;
}): string | undefined {
    // Don't render twice while theme settings are loading
    if (!themeSettings) {
        return undefined;
    }
    const [description, accentColor, icon, logo, coverImage, headingFont, bodyFont] = getSettingValues(settings, [
        "description", "accent_color", "icon", "logo", "cover_image", "heading_font", "body_font",
    ]) as string[];

    const keyValues = themeSettings.reduce<Record<string, string>>((obj, { key, value }) => ({ ...obj, [key]: value as string }), {});

    const params = new URLSearchParams();
    params.append("c", accentColor);
    params.append("d", description);
    params.append("icon", icon);
    params.append("logo", logo);
    params.append("cover", coverImage);
    params.append("bf", bodyFont);
    params.append("hf", headingFont);
    const custom: Record<string, string | typeof hiddenCustomThemeSettingValue> = {};
    themeSettings.forEach((setting) => {
        custom[setting.key] = isCustomThemeSettingVisible(setting, keyValues) ? (setting.value as string) : hiddenCustomThemeSettingValue;
    });
    params.append("custom", JSON.stringify(custom));

    return params.toString();
}

function DesignDialogContent({ settings }: { settings: Setting[] }) {
    const navigate = useNavigate();
    const { search } = useLocation();
    const { confirm } = useConfirmation();
    const handleError = useSettingsHandleError();
    const { data: siteResponse } = useBrowseSite();
    const siteData = siteResponse?.site;
    const { mutateAsync: editSettings } = useEditSettings();
    const { data: { posts: [latestPost] } = { posts: [] } } = useBrowsePosts({
        searchParams: {
            filter: "status:published",
            order: "published_at DESC",
            limit: "1",
            fields: "id,url",
        },
    });
    const { data: themeSettings } = useBrowseCustomThemeSettings();
    const { mutateAsync: editThemeSettings } = useEditCustomThemeSettings();
    const [selectedPreviewTab, setSelectedPreviewTab] = useState("homepage");
    const [selectedSidebarTab, setSelectedSidebarTab] = useState("global");
    const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

    const refParam = new URLSearchParams(search).get("ref");

    const {
        formState,
        saveState,
        handleSave,
        updateForm,
        setFormState,
        okProps,
    } = useForm<{ settings: DirtySetting[]; themeSettings: DirtyThemeSetting[] | undefined }>({
        initialState: {
            settings,
            themeSettings: themeSettings ? themeSettings.custom_theme_settings : undefined,
        },
        savingDelay: 500,
        onSave: async () => {
            if (formState.themeSettings?.some((setting) => setting.dirty)) {
                const response = await editThemeSettings(formState.themeSettings);
                setFormState((state) => ({ ...state, themeSettings: response.custom_theme_settings }));
            }

            if (formState.settings.some((setting) => setting.dirty)) {
                const { settings: newSettings } = await editSettings(formState.settings.filter((setting) => setting.dirty));
                setFormState((state) => ({ ...state, settings: newSettings }));
            }
        },
        onSaveError: handleError,
    });

    useEffect(() => {
        if (themeSettings) {
            setFormState((state) => ({ ...state, themeSettings: themeSettings.custom_theme_settings }));
        }
    }, [setFormState, themeSettings]);

    const updateGlobalSetting = (key: string, value: SettingValue) => {
        updateForm((state) => ({
            ...state,
            settings: state.settings.map((setting) => (setting.key === key ? { ...setting, value, dirty: true } : setting)),
        }));
    };

    const updateThemeSetting = (updated: CustomThemeSetting) => {
        updateForm((state) => ({
            ...state,
            themeSettings: state.themeSettings?.map((setting) => (setting.key === updated.key ? { ...updated, dirty: true } : setting)),
        }));
    };

    const [description, accentColor, icon, logo, coverImage, headingFont, bodyFont] = getSettingValues(formState.settings, [
        "description", "accent_color", "icon", "logo", "cover_image", "heading_font", "body_font",
    ]) as string[];

    const themeSettingGroups = (formState.themeSettings || []).reduce((groups, setting) => {
        const group = setting.group === "homepage" || setting.group === "post" ? setting.group : "site-wide";
        return { ...groups, [group]: (groups[group] || []).concat(setting) };
    }, {} as Record<string, CustomThemeSetting[] | undefined>);

    const themeSettingSections: ThemeSettingSection[] = Object.entries(themeSettingGroups).map(([id, group]) => ({
        id,
        settings: group || [],
        title: id === "site-wide" ? "Site wide" : (id === "homepage" ? "Homepage" : "Post"),
    }));

    const onSidebarTabChange = (id: string) => {
        setSelectedSidebarTab(id);
        setSelectedPreviewTab("homepage");
    };

    let selectedTabURL = siteData ? getHomepageUrl(siteData) : "";
    if (selectedPreviewTab === "post" && latestPost?.url) {
        selectedTabURL = latestPost.url;
    }

    const previewData = getPreviewData({ settings: formState.settings, themeSettings: formState.themeSettings });

    const requestClose = () => {
        confirmIfDirty(confirm, saveState === "unsaved", () => {
            if (refParam === "setup") {
                navigate("/analytics");
            } else {
                navigate("/settings/design");
            }
        });
    };

    const brandValues = { description, accentColor, icon, logo, coverImage, headingFont, bodyFont };

    const sidebar = (
        <div className="grow" data-testid="design-setting-tabs">
            {themeSettingSections.length > 0 ? (
                <Tabs value={selectedSidebarTab} variant="underline" onValueChange={onSidebarTabChange}>
                    <TabsList className="sticky top-0 z-50 bg-background">
                        <TabsTrigger value="global">Brand</TabsTrigger>
                        <TabsTrigger value="theme-settings">Theme</TabsTrigger>
                    </TabsList>
                    <TabsContent value="global"><BrandSettings updateSetting={updateGlobalSetting} values={brandValues} /></TabsContent>
                    <TabsContent value="theme-settings"><ThemeSettingsForm sections={themeSettingSections} updateSetting={updateThemeSetting} /></TabsContent>
                </Tabs>
            ) : (
                <BrandSettings updateSetting={updateGlobalSetting} values={brandValues} />
            )}
        </div>
    );

    return (
        <PreviewDialog
            buttonsDisabled={okProps.disabled}
            device={previewDevice}
            okLabel={okProps.label || "Save"}
            preview={<SitePreviewFrame previewData={previewData} testId="theme-preview" url={selectedTabURL} />}
            sidebar={sidebar}
            previewToolbarTabs={latestPost ? (
                <Tabs value={selectedPreviewTab} variant="button-sm" onValueChange={(id) => setSelectedPreviewTab(id)}>
                    <TabsList>
                        <TabsTrigger value="homepage">Homepage</TabsTrigger>
                        <TabsTrigger value="post">Post</TabsTrigger>
                    </TabsList>
                </Tabs>
            ) : undefined}
            siteLink={siteData ? getHomepageUrl(siteData) : undefined}
            testId="design-modal"
            title="Design"
            onClose={requestClose}
            onDeviceChange={setPreviewDevice}
            onOk={() => void handleSave({ fakeWhenUnchanged: true })}
        />
    );
}

export function DesignDialog() {
    const { data: settingsData } = useBrowseSettings();
    const { data: siteResponse } = useBrowseSite();

    if (!settingsData || !siteResponse) {
        return null;
    }

    return <DesignDialogContent settings={settingsData.settings} />;
}
