import { createMutation, createQuery } from '../utils/api/hooks';
import { customThemeSettingsDataType } from './custom-theme-settings';

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
    emberUpdateType: 'createOrUpdate',
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
    dataType: customThemeSettingsDataType,
  },
});

export const useDeleteTheme = createMutation<unknown, string>({
  method: 'DELETE',
  path: (name) => `/themes/${name}/`,
  updateQueries: {
    dataType,
    emberUpdateType: 'delete',
    update: (_, currentData, name) => ({
      ...(currentData as ThemesResponseType),
      themes: (currentData as ThemesResponseType).themes.filter((theme) => theme.name !== name),
    }),
  },
});

export const useInstallTheme = createMutation<ThemesInstallResponseType, string>({
  method: 'POST',
  path: () => '/themes/install/',
  searchParams: (repo) => ({ source: 'github', ref: repo }),
  updateQueries: {
    dataType,
    emberUpdateType: 'createOrUpdate',
    // Assume that all invite queries should include this new one
    update: (newData, currentData) =>
      currentData && {
        ...(currentData as ThemesResponseType),
        themes: [...(currentData as ThemesResponseType).themes, ...newData.themes],
      },
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
    emberUpdateType: 'createOrUpdate',
    // Uploading can replace an existing theme, so swap it out by name
    // instead of appending a duplicate entry
    update: (newData, currentData) =>
      currentData && {
        ...(currentData as ThemesResponseType),
        themes: [
          ...(currentData as ThemesResponseType).themes.filter(
            (theme) => !newData.themes.some(({ name }) => name === theme.name),
          ),
          ...newData.themes,
        ],
      },
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

// Imperative transport for the Builder publish pipeline.

export type ThemeUpload = {
  archive: Blob;
  name: string;
  copySettingsFrom?: string;
};

export type ThemeSettingUpdate = {
  key: string;
  value: string | boolean | null;
};

export type ThemePublishTransport = {
  download?: (name: string, signal: AbortSignal) => Promise<ArrayBuffer>;
  upload: (input: ThemeUpload, signal: AbortSignal) => Promise<void>;
  activate: (name: string, signal: AbortSignal) => Promise<void>;
  updateGlobalSettings: (settings: ThemeSettingUpdate[], signal: AbortSignal) => Promise<void>;
  updateCustomSettings: (settings: ThemeSettingUpdate[], signal: AbortSignal) => Promise<void>;
};

type GhostApiErrorBody = {
  errors?: Array<{ message?: string }>;
};

export class ThemePublishRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ThemePublishRequestError';
    this.status = status;
  }
}

async function requestGhostApi(
  apiRoot: string,
  path: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${apiRoot.replace(/\/$/, '')}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
    signal,
  });
  if (response.ok) {
    return;
  }
  const body = (await response.json().catch(() => null)) as GhostApiErrorBody | null;
  throw new ThemePublishRequestError(
    response.status,
    body?.errors?.[0]?.message || `Ghost Admin API request failed (${response.status}).`,
  );
}

export function createAdminThemePublishTransport(apiRoot: string): ThemePublishTransport {
  return {
    download: async (name, signal) => {
      const response = await fetch(
        `${apiRoot.replace(/\/$/, '')}/themes/${encodeURIComponent(name)}/download/`,
        {
          credentials: 'include',
          headers: { Accept: 'application/zip, application/octet-stream, */*' },
          signal,
        },
      );
      if (!response.ok) {
        throw new Error(
          `Could not verify the installed theme before publishing (${response.status}).`,
        );
      }
      return response.arrayBuffer();
    },
    upload: ({ archive, name, copySettingsFrom }, signal) => {
      const formData = new FormData();
      formData.append('file', archive, `${name}.zip`);
      const query = copySettingsFrom
        ? `?copy_settings_from=${encodeURIComponent(copySettingsFrom)}`
        : '';
      return requestGhostApi(
        apiRoot,
        `/themes/upload/${query}`,
        { method: 'POST', body: formData },
        signal,
      );
    },
    activate: (name, signal) =>
      requestGhostApi(
        apiRoot,
        `/themes/${encodeURIComponent(name)}/activate/`,
        { method: 'PUT' },
        signal,
      ),
    updateGlobalSettings: (settings, signal) =>
      requestGhostApi(
        apiRoot,
        '/settings/',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        },
        signal,
      ),
    updateCustomSettings: (settings, signal) =>
      requestGhostApi(
        apiRoot,
        '/custom_theme_settings/',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_theme_settings: settings }),
        },
        signal,
      ),
  };
}

export function downloadThemeArchive(
  apiRoot: string,
  name: string,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${apiRoot.replace(/\/$/, '')}/themes/${encodeURIComponent(name)}/download/`, {
    credentials: 'include',
    headers: { Accept: 'application/zip, application/octet-stream, */*' },
    signal,
  });
}
