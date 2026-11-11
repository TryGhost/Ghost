import { useCallback, useEffect, useState } from 'react';
import {
  type CustomThemeSetting,
  useBrowseCustomThemeSettings,
  useBrowseThemeCustomSettings,
  useEditCustomThemeSettings,
} from '@tryghost/admin-x-framework/api/custom-theme-settings';
import {
  type Setting,
  type SettingValue,
  getSettingValues,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { type Dirtyable, useForm, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { type FatalErrors } from '@/settings/site/theme/invalid-theme-modal';
import { parseFatalErrors } from '@/settings/site/theme/theme-validation-issues';
import { JSONError } from '@tryghost/admin-x-framework/errors';
import { type Theme, useActivateThemeWithSettings } from '@tryghost/admin-x-framework/api/themes';
import { useGlobalData } from '@/settings/providers/global-data-context';
import type { GlobalSettingValues } from './global-settings';

export interface ThemeSettingSection {
  id: string;
  title: string;
  settings: CustomThemeSetting[];
}

function groupThemeSettings(settings: CustomThemeSetting[]): ThemeSettingSection[] {
  const groups = settings.reduce(
    (result, setting) => {
      const group =
        setting.group === 'homepage' || setting.group === 'post' ? setting.group : 'site-wide';

      return {
        ...result,
        [group]: (result[group] || []).concat(setting),
      };
    },
    {} as { [key: string]: CustomThemeSetting[] | undefined },
  );

  return Object.entries(groups).map(([id, group]) => ({
    id,
    settings: group || [],
    title: id === 'site-wide' ? 'Site wide' : id === 'homepage' ? 'Homepage' : 'Post',
  }));
}

/** What activating a previewed theme came to: activated, or the reason it wasn't */
export type PreviewThemeActivation =
  | { activated: true }
  | { activated: false; fatalErrors?: FatalErrors };

/**
 * The design settings being edited: the site's brand settings and the active
 * theme's custom settings, saved together. Shared by the Design modal and any
 * other place the design is edited (e.g. View site's Customize panel).
 *
 * With a `previewTheme` (an installed theme that isn't active), the theme
 * settings are that theme's instead, as it would look once activated: its
 * stored settings, or its defaults if it has never been set up. They are only
 * for the preview: Save never sends them, and they reach the site only if the
 * theme is activated with `activatePreviewTheme`.
 */
export function useDesignForm({
  previewTheme,
  previewToken,
  resolving = false,
}: {
  previewTheme?: Theme;
  /** Lets the site render the previewed theme (see useThemePreview) */
  previewToken?: string;
  /** A previewed theme is still being looked up: the preview waits for it */
  resolving?: boolean;
} = {}) {
  const { settings } = useGlobalData();
  const { mutateAsync: editSettings } = useEditSettings();
  const { data: themeSettings } = useBrowseCustomThemeSettings();
  const { mutateAsync: editThemeSettings } = useEditCustomThemeSettings();
  const { mutateAsync: activateThemeWithSettings } = useActivateThemeWithSettings();
  const handleError = useHandleError();

  // Each previewed theme's settings as changed in this session, by theme name;
  // a theme has an entry only once one of its settings has been changed
  const [previewedThemeSettings, setPreviewedThemeSettings] = useState<
    Record<string, CustomThemeSetting[]>
  >({});
  const {
    data: storedPreviewThemeSettings,
    isError: previewThemeSettingsError,
    refetch: refetchPreviewThemeSettings,
  } = useBrowseThemeCustomSettings({
    searchParams: { theme: previewTheme?.name || '' },
    enabled: Boolean(previewTheme),
    defaultErrorHandler: false,
  });
  const storedSettings = previewTheme
    ? storedPreviewThemeSettings?.custom_theme_settings
    : undefined;
  // Undefined while a previewed theme's settings load
  const previewThemeSettings = previewTheme
    ? previewedThemeSettings[previewTheme.name] || storedSettings
    : undefined;

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
        setFormState((state) => ({ ...state, themeSettings: response.custom_theme_settings }));
      }

      if (formState.settings.some((setting) => setting.dirty)) {
        const { settings: newSettings } = await editSettings(
          formState.settings.filter((setting) => setting.dirty),
        );
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
      settings: state.settings.map((setting) =>
        setting.key === key ? { ...setting, value, dirty: true } : setting,
      ),
    }));
  };

  const updateThemeSetting = (updated: CustomThemeSetting) => {
    if (previewTheme) {
      const name = previewTheme.name;
      setPreviewedThemeSettings((current) => {
        const base = current[name] || storedSettings;
        if (!base) {
          return current;
        }
        return {
          ...current,
          [name]: base.map((setting) => (setting.key === updated.key ? updated : setting)),
        };
      });
      return;
    }

    updateForm((state) => ({
      ...state,
      themeSettings: state.themeSettings?.map((setting) =>
        setting.key === updated.key ? { ...updated, dirty: true } : setting,
      ),
    }));
  };

  /** Sets every theme setting's value at once (e.g. a variant's), as unsaved changes */
  const applyThemeSettingValues = useCallback(
    (values: Record<string, CustomThemeSetting['value']>) => {
      const apply = (settingsList: CustomThemeSetting[]) =>
        settingsList.map((setting) =>
          Object.hasOwn(values, setting.key) && values[setting.key] !== setting.value
            ? ({ ...setting, value: values[setting.key] } as CustomThemeSetting)
            : setting,
        );

      if (previewTheme) {
        const name = previewTheme.name;
        setPreviewedThemeSettings((current) => {
          const base = current[name] || storedSettings;
          return base ? { ...current, [name]: apply(base) } : current;
        });
        return;
      }

      updateForm((state) => ({
        ...state,
        themeSettings: state.themeSettings?.map((setting) =>
          Object.hasOwn(values, setting.key) && values[setting.key] !== setting.value
            ? ({
                ...setting,
                value: values[setting.key],
                dirty: true,
              } as Dirtyable<CustomThemeSetting>)
            : setting,
        ),
      }));
    },
    [previewTheme, storedSettings, updateForm],
  );

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

  const themeSettingSections = groupThemeSettings(
    (previewTheme ? previewThemeSettings : formState.themeSettings) || [],
  );

  // What a preview of the site renders with (ThemePreview). Without theme
  // settings, it waits: while a linked theme is looked up, or a previewed
  // theme's settings or token load, rather than show the wrong theme meanwhile.
  const previewReady = !resolving && (!previewTheme || Boolean(previewToken));
  const previewSettings = {
    description,
    accentColor,
    icon,
    logo,
    coverImage,
    headingFont,
    bodyFont,
    themeSettings: previewReady
      ? previewTheme
        ? previewThemeSettings
        : formState.themeSettings
      : undefined,
    themeToken: previewTheme ? previewToken : undefined,
  };

  /**
   * Makes the previewed theme the site's. Anything else unsaved (brand changes,
   * the active theme's settings) is saved first, as Save would; then one request
   * activates the theme with the settings changed in the preview, which the
   * server checks before activating.
   */
  const activatePreviewTheme = useCallback(async (): Promise<PreviewThemeActivation> => {
    if (!previewTheme || !previewThemeSettings || !storedSettings) {
      return { activated: false };
    }

    if (saveState === 'unsaved') {
      try {
        if (!(await handleSave())) {
          return { activated: false };
        }
      } catch {
        // The save reported its own error
        return { activated: false };
      }
    }

    // Only what was changed here: the rest is the theme's own (stored or default)
    const changed = previewThemeSettings.filter((setting) => {
      const stored = storedSettings.find(({ key }) => key === setting.key);
      return !stored || stored.value !== setting.value;
    });

    try {
      await activateThemeWithSettings({
        name: previewTheme.name,
        settings: changed.map(({ key, value }) => ({ key, value })),
      });
      setPreviewedThemeSettings(({ [previewTheme.name]: _, ...others }) => others);
      return { activated: true };
    } catch (e) {
      // The theme's own errors show as the Themes list shows them; a refused
      // setting, or anything else, as an error message
      const fatalErrors =
        e instanceof JSONError && e.response?.status === 422
          ? parseFatalErrors(e.data?.errors)
          : null;
      if (fatalErrors) {
        return { activated: false, fatalErrors };
      }
      handleError(e);
      return { activated: false };
    }
  }, [
    activateThemeWithSettings,
    handleError,
    handleSave,
    previewTheme,
    previewThemeSettings,
    saveState,
    storedSettings,
  ]);

  return {
    globalSettings,
    themeSettingSections,
    previewSettings,
    updateGlobalSetting,
    updateThemeSetting,
    // Unsaved: the form's own changes, or another theme being previewed (closing
    // leaves it, as the site's theme stays), with or without changes to its settings
    dirty: saveState === 'unsaved' || Boolean(previewTheme),
    /** Unsaved edits only: what would be lost by moving to another view of the same preview */
    editsDirty:
      saveState === 'unsaved' || Boolean(previewTheme && previewedThemeSettings[previewTheme.name]),
    /** The form's own unsaved changes (brand, the active theme's settings), saved on activation */
    formDirty: saveState === 'unsaved',
    themeSettingsLoading:
      Boolean(previewTheme) && !previewThemeSettings && !previewThemeSettingsError,
    themeSettingsError: Boolean(previewTheme) && previewThemeSettingsError,
    /** Loads the previewed theme's settings again, after they failed to load */
    retryThemeSettings: () => void refetchPreviewThemeSettings(),
    activatePreviewTheme,
    applyThemeSettingValues,
    /** The theme settings shown, once loaded: the previewed theme's, or the active theme's */
    currentThemeSettings: previewTheme ? previewThemeSettings : formState.themeSettings,
    saveState,
    okProps,
    handleSave,
  };
}
