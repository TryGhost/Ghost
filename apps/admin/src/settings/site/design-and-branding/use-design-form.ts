import { useEffect } from 'react';
import {
  type CustomThemeSetting,
  useBrowseCustomThemeSettings,
  useEditCustomThemeSettings,
} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import {
  type Setting,
  type SettingValue,
  getSettingValues,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { type Dirtyable, useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';
import type { GlobalSettingValues } from './global-settings';

export interface ThemeSettingSection {
  id: string;
  title: string;
  settings: CustomThemeSetting[];
}

/**
 * The design settings being edited: the site's brand settings and the active
 * theme's custom settings, saved together. Shared by the Design modal and any
 * other place the design is edited (e.g. View site's Customize panel).
 */
export function useDesignForm() {
  const { settings } = useGlobalData();
  const { mutateAsync: editSettings } = useEditSettings();
  const { data: themeSettings } = useBrowseCustomThemeSettings();
  const { mutateAsync: editThemeSettings } = useEditCustomThemeSettings();
  const handleError = useHandleError();

  const { formState, saveState, handleSave, updateForm, setFormState, okProps } = useForm<{
    settings: Dirtyable<Setting>[];
    themeSettings: Dirtyable<CustomThemeSetting>[] | undefined;
  }>({
    initialState: {
      settings,
      themeSettings: themeSettings?.custom_theme_settings,
    },
    savingDelay: 500,
    onSave: async () => {
      if (formState.themeSettings?.some((setting) => setting.dirty)) {
        const response = await editThemeSettings(formState.themeSettings);
        setFormState((state) => ({
          ...state,
          themeSettings:
            state.themeSettings === formState.themeSettings
              ? response.custom_theme_settings
              : state.themeSettings,
        }));
      }

      if (formState.settings.some((setting) => setting.dirty)) {
        const { settings: newSettings } = await editSettings(
          formState.settings.filter((setting) => setting.dirty),
        );
        setFormState((state) => ({
          ...state,
          settings: state.settings === formState.settings ? newSettings : state.settings,
        }));
      }
    },
    onSaveError: handleError,
  });

  useEffect(() => {
    if (themeSettings) {
      setFormState((state) => ({
        ...state,
        themeSettings: state.themeSettings?.some((setting) => setting.dirty)
          ? state.themeSettings
          : themeSettings.custom_theme_settings,
      }));
    }
  }, [setFormState, themeSettings]);

  const updateGlobalSetting = (key: string, value: SettingValue) => {
    updateForm((state) => ({
      ...state,
      settings: state.settings.map((setting) =>
        setting.key === key ? { ...setting, value, dirty: true } : setting,
      ),
    }));
  };

  const updateThemeSetting = (updated: CustomThemeSetting) => {
    updateForm((state) => ({
      ...state,
      themeSettings: state.themeSettings?.map((setting) =>
        setting.key === updated.key ? { ...updated, dirty: true } : setting,
      ),
    }));
  };

  const [description, accentColor, icon, logo, coverImage, headingFont, bodyFont] =
    getSettingValues(formState.settings, [
      'description',
      'accent_color',
      'icon',
      'logo',
      'cover_image',
      'heading_font',
      'body_font',
    ]) as string[];
  const globalSettings: GlobalSettingValues = {
    description,
    accentColor,
    icon,
    logo,
    coverImage,
    headingFont,
    bodyFont,
  };

  const themeSettingGroups = (formState.themeSettings || []).reduce(
    (groups, setting) => {
      const group =
        setting.group === 'homepage' || setting.group === 'post' ? setting.group : 'site-wide';

      return {
        ...groups,
        [group]: (groups[group] || []).concat(setting),
      };
    },
    {} as { [key: string]: CustomThemeSetting[] | undefined },
  );

  const themeSettingSections: ThemeSettingSection[] = Object.entries(themeSettingGroups).map(
    ([id, group]) => ({
      id,
      settings: group || [],
      title: id === 'site-wide' ? 'Site wide' : id === 'homepage' ? 'Homepage' : 'Post',
    }),
  );

  // What a preview of the site renders with (ThemePreview)
  const previewSettings = {
    description,
    accentColor,
    icon,
    logo,
    coverImage,
    headingFont,
    bodyFont,
    themeSettings: formState.themeSettings,
  };

  return {
    globalSettings,
    themeSettingSections,
    previewSettings,
    updateGlobalSetting,
    updateThemeSetting,
    dirty: saveState === 'unsaved',
    saveState,
    okProps,
    handleSave,
  };
}
