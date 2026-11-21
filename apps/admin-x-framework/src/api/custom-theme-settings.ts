import { z } from 'zod';
import { createMutation, createQuery } from '../utils/api/hooks';
import { Setting } from './settings';

type CustomThemeSettingData =
  | { type: 'text'; value: string | null; default: string | null }
  | { type: 'color'; value: string; default: string }
  | { type: 'image'; value: string | null }
  | { type: 'boolean'; value: boolean; default: boolean }
  | {
      type: 'select';
      value: string;
      default: string;
      options: string[];
    };

export type CustomThemeSetting = CustomThemeSettingData & {
  /** null for a setting never stored yet: one of a theme that isn't active, previewed */
  id: string | null;
  key: string;
  description?: string;
  // homepage and post are the only two groups we handle, but technically theme authors can put other things in package.json
  group?: 'homepage' | 'post' | string;
  visibility?: string;
};

export const hiddenCustomThemeSettingValue = null;

export interface CustomThemeSettingsResponseType {
  custom_theme_settings: CustomThemeSetting[];
}

// The settings of a theme that isn't active come from what its package.json
// declares, so they are checked before the preview relies on them
const settingBase = {
  id: z.string().nullable(),
  key: z.string(),
  description: z.string().optional(),
  group: z.string().optional(),
  visibility: z.string().optional(),
};
const CustomThemeSettingSchema: z.ZodType<CustomThemeSetting> = z.discriminatedUnion('type', [
  z.object({
    ...settingBase,
    type: z.literal('text'),
    value: z.string().nullable(),
    // A text setting may declare no default
    default: z.string().nullable().default(null),
  }),
  z.object({ ...settingBase, type: z.literal('color'), value: z.string(), default: z.string() }),
  z.object({ ...settingBase, type: z.literal('image'), value: z.string().nullable() }),
  z.object({
    ...settingBase,
    type: z.literal('boolean'),
    value: z.boolean(),
    default: z.boolean(),
  }),
  z.object({
    ...settingBase,
    type: z.literal('select'),
    value: z.string(),
    default: z.string(),
    options: z.array(z.string()),
  }),
]);
const CustomThemeSettingsResponse: z.ZodType<CustomThemeSettingsResponseType> = z.object({
  custom_theme_settings: z.array(CustomThemeSettingSchema),
});

const dataType = 'CustomThemeSettingsResponseType';

export const customThemeSettingsDataType = dataType;

// Kept apart from the active theme's settings, which edits overwrite in place
export const themeCustomSettingsDataType = 'ThemeCustomSettingsResponseType';

export const useBrowseCustomThemeSettings = createQuery<CustomThemeSettingsResponseType>({
  dataType,
  path: '/custom_theme_settings/',
});

export const useEditCustomThemeSettings = createMutation<
  CustomThemeSettingsResponseType,
  Setting[]
>({
  method: 'PUT',
  path: () => '/custom_theme_settings/',
  body: (settings) => ({ custom_theme_settings: settings }),

  updateQueries: {
    dataType,
    update: (newData) => newData,
  },
  invalidateQueries: {
    dataType: themeCustomSettingsDataType,
  },
});

/**
 * Any installed theme's custom settings, with the values stored for that
 * theme (its defaults if it has never been set up), e.g. to preview a theme
 * that isn't active. Pass the theme as `searchParams: {theme}`.
 */
export const useBrowseThemeCustomSettings = createQuery<CustomThemeSettingsResponseType>({
  dataType: themeCustomSettingsDataType,
  path: '/custom_theme_settings/',
  parseResponse: (raw) => CustomThemeSettingsResponse.parse(raw),
});
