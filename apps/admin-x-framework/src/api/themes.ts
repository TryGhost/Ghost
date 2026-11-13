import { z } from 'zod';
import { createMutation, createQuery, createQueryWithId } from '../utils/api/hooks';
import { customThemeSettingsDataType, themeCustomSettingsDataType } from './custom-theme-settings';

// Types

/** A theme's custom template. Only the active theme carries these. */
export type ThemeTemplate = {
  /** The template file without its extension, e.g. `custom-full-feature`. */
  filename: string;
  name: string;
  /** The content types the template applies to, e.g. `['post']` for `post-*.hbs`. */
  for?: string[];
  /** The slug a `post-*.hbs`/`page-*.hbs` template is bound to; null for `custom-*.hbs`. */
  slug?: string | null;
};

/** A custom setting as a theme's package.json declares it (`config.custom`). */
export type ThemeCustomSettingDefinition = {
  type: 'select' | 'boolean' | 'color' | 'image' | 'text';
  options?: string[];
  default?: string | boolean | null;
  description?: string;
  group?: string;
  visibility?: string;
};

export type Theme = {
  active: boolean;
  name: string;
  package: {
    name?: string;
    description?: string;
    version?: string;
    author?: {
      name?: string;
    };
    config?: {
      custom?: Record<string, ThemeCustomSettingDefinition>;
      /**
       * Ways the theme can be set up, by name (e.g. its demos: "News",
       * "Magazine"), each giving values for some of its custom settings
       */
      presets?: Record<string, Record<string, string | boolean>>;
    };
  };
  templates?: ThemeTemplate[];
};

export type InstalledTheme = Theme & {
  errors?: ThemeProblem<'error'>[];
  warnings?: ThemeProblem<'warning'>[];
};

export type ThemeProblem<Level extends string = 'error' | 'warning' | 'recommendation'> = {
  code: string;
  details: string;
  failures: Array<{
    ref: string;
    message?: string;
    rule?: string;
  }>;
  fatal: boolean;
  level: Level;
  rule: string;
};

export const PAGE_BUILDER_PROBLEM_CODE = 'GS110-NO-MISSING-PAGE-BUILDER-USAGE';

/** Whether a gscan problem says the theme never asks for the named page-builder attribute. */
export function missesPageBuilderAttribute(
  problem: ThemeProblem<string>,
  attribute: string,
): boolean {
  return (
    problem.code === PAGE_BUILDER_PROBLEM_CODE &&
    (problem.failures ?? []).some(({ message }) => message?.includes(`@page.${attribute}`))
  );
}

export interface ThemesResponseType {
  themes: Theme[];
}

export interface ThemesInstallResponseType {
  themes: InstalledTheme[];
}

// What the activation with settings answers is checked before it replaces the
// themes Admin holds: each theme's name, whether it's active, and its package,
// which is what Admin relies on. Everything else the server sends is kept as is
// (a theme's errors and warnings, its own package.json fields).
const ActivatedThemeShape = z.looseObject({
  name: z.string(),
  active: z.boolean(),
  package: z.looseObject({}),
});
const ActivatedThemesResponse: z.ZodType<ThemesResponseType> = z.object({
  themes: z.array(z.custom<Theme>((value) => ActivatedThemeShape.safeParse(value).success)),
});

// Requests

const dataType = 'ThemesResponseType';

export const useBrowseThemes = createQuery<ThemesResponseType>({
  dataType,
  path: '/themes/',
});

export const useActiveTheme = createQuery<ThemesInstallResponseType>({
  dataType,
  path: '/themes/active/',
});

export const useActivateTheme = createMutation<ThemesResponseType, string>({
  method: 'PUT',
  path: (name) => `/themes/${name}/activate/`,
  updateQueries: {
    dataType,
    update: (newData: ThemesResponseType, currentData: unknown) => ({
      ...(currentData as ThemesResponseType),
      themes: (currentData as ThemesResponseType).themes.map((theme) => {
        const newTheme = newData.themes.find(({ name }) => name === theme.name);

        if (newTheme) {
          return newTheme;
        } else {
          return { ...theme, active: false };
        }
      }),
    }),
  },
  invalidateQueries: {
    dataType: [customThemeSettingsDataType, themeCustomSettingsDataType],
  },
});

/**
 * Activates a theme with the custom settings chosen while previewing it, in one
 * request: the server checks the settings first, so a bad one never leaves the
 * theme live but half set up.
 */
export const useActivateThemeWithSettings = createMutation<
  ThemesResponseType,
  { name: string; settings: Array<{ key: string; value: unknown }> }
>({
  method: 'PUT',
  path: ({ name }) => `/themes/${name}/activate/`,
  body: ({ settings }) => ({ custom_theme_settings: settings }),
  parseResponse: (raw) => ActivatedThemesResponse.parse(raw),
  updateQueries: {
    dataType,
    // Nothing to update when the themes haven't been loaded
    update: (newData: ThemesResponseType, currentData: unknown) =>
      currentData && {
        ...(currentData as ThemesResponseType),
        themes: (currentData as ThemesResponseType).themes.map((theme) => {
          const newTheme = newData.themes.find(({ name }) => name === theme.name);
          return newTheme || { ...theme, active: false };
        }),
      },
  },
  invalidateQueries: {
    dataType: [customThemeSettingsDataType, themeCustomSettingsDataType],
  },
});

const ThemePreviewTokenResponse = z.object({
  theme_previews: z.array(
    z.object({ theme: z.string(), token: z.string(), expires_at: z.string() }),
  ),
});

export type ThemePreviewTokenResponseType = z.output<typeof ThemePreviewTokenResponse>;

/**
 * A short-lived token that lets the site render a theme that isn't active, for
 * Admin's previews of it. Pass the theme's name.
 */
export const useThemePreviewToken = createQueryWithId<ThemePreviewTokenResponseType>({
  dataType: 'ThemePreviewTokenResponseType',
  path: (name) => `/themes/${name}/preview-token/`,
  parseResponse: (raw) => ThemePreviewTokenResponse.parse(raw),
});

export const useDeleteTheme = createMutation<unknown, string>({
  method: 'DELETE',
  path: (name) => `/themes/${name}/`,
  updateQueries: {
    dataType,
    update: (_, currentData, name) => ({
      ...(currentData as ThemesResponseType),
      themes: (currentData as ThemesResponseType).themes.filter((theme) => theme.name !== name),
    }),
  },
});

// Installs and uploads overwrite an existing theme with the same name
function replaceThemesByName(newData: ThemesInstallResponseType, currentData: unknown) {
  return (
    currentData && {
      ...(currentData as ThemesResponseType),
      themes: [
        ...(currentData as ThemesResponseType).themes.filter(
          (theme) => !newData.themes.some(({ name }) => name === theme.name),
        ),
        ...newData.themes,
      ],
    }
  );
}

export const useInstallTheme = createMutation<ThemesInstallResponseType, string>({
  method: 'POST',
  path: () => '/themes/install/',
  searchParams: (repo) => ({ source: 'github', ref: repo }),
  updateQueries: {
    dataType,
    update: replaceThemesByName,
  },
  // Overwriting a theme re-syncs its custom settings, the active theme's and the
  // ones previewed before: a new version may declare other settings
  invalidateQueries: {
    dataType: [customThemeSettingsDataType, themeCustomSettingsDataType],
  },
});

export const useUploadTheme = createMutation<
  ThemesInstallResponseType,
  { file: File; copySettingsFrom?: string }
>({
  method: 'POST',
  path: () => '/themes/upload/',
  searchParams: ({ copySettingsFrom }): Record<string, string> =>
    copySettingsFrom ? { copy_settings_from: copySettingsFrom } : {},
  body: ({ file }) => {
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  },
  updateQueries: {
    dataType,
    update: replaceThemesByName,
  },
  // Overwriting a theme re-syncs its custom settings, the active theme's and the
  // ones previewed before: a new version may declare other settings
  invalidateQueries: {
    dataType: [customThemeSettingsDataType, themeCustomSettingsDataType],
  },
});

// Helpers

export function isActiveTheme(theme: Theme): boolean {
  return theme.active;
}

export function isDefaultTheme(theme: { name: string }): boolean {
  return theme.name.toLowerCase() === 'source';
}

export function isLegacyTheme(theme: { name: string }): boolean {
  return theme.name.toLowerCase() === 'casper';
}

export function isDefaultOrLegacyTheme(theme: { name: string }): boolean {
  return isDefaultTheme(theme) || isLegacyTheme(theme);
}

export function isDeletableTheme(theme: Theme): boolean {
  return !isDefaultTheme(theme) && !isLegacyTheme(theme) && !isActiveTheme(theme);
}
