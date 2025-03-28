import {createMutation, createQuery} from '../utils/api/hooks';
import {customThemeSettingsDataType} from './customThemeSettings';

// Types

export type Theme = {
    active: boolean;
    name: string;
    package: {
        name?: string;
        description?: string;
        version?: string;
        author?: {
            name?: string;
        }
    };
    templates?: string[];
}

export type InstalledTheme = Theme & {
    gscan_errors?: ThemeProblem<'error'>[];
    warnings?: ThemeProblem<'warning'>[];
}

export type ThemeProblem<Level extends string = 'error' | 'warning'> = {
    code: string
    details: string
    failures: Array<{
        ref: string
        message?: string
        rule?: string
    }>
    fatal: boolean
    level: Level
    rule: string
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
    path: '/themes/'
});

export const useActiveTheme = createQuery<ThemesInstallResponseType>({
    dataType,
    path: '/themes/active/'
});

export const useActivateTheme = createMutation<ThemesResponseType, string>({
    method: 'PUT',
    path: name => `/themes/${name}/activate/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: (newData: ThemesResponseType, currentData: unknown) => ({
            ...(currentData as ThemesResponseType),
            themes: (currentData as ThemesResponseType).themes.map((theme) => {
                const newTheme = newData.themes.find(({name}) => name === theme.name);

                if (newTheme) {
                    return newTheme;
                } else {
                    return {...theme, active: false};
                }
            })
        })
    },
    invalidateQueries: {
        dataType: customThemeSettingsDataType
    }
});

export const useDeleteTheme = createMutation<unknown, string>({
    method: 'DELETE',
    path: name => `/themes/${name}/`,
    updateQueries: {
        dataType,
        emberUpdateType: 'delete',
        update: (_, currentData, name) => ({
            ...(currentData as ThemesResponseType),
            themes: (currentData as ThemesResponseType).themes.filter(theme => theme.name !== name)
        })
    }
});

export const useInstallTheme = createMutation<ThemesInstallResponseType, string>({
    method: 'POST',
    path: () => '/themes/install/',
    searchParams: repo => ({source: 'github', ref: repo}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        // Assume that all invite queries should include this new one
        update: (newData, currentData) => (currentData && {
            ...(currentData as ThemesResponseType),
            themes: [
                ...((currentData as ThemesResponseType).themes),
                ...newData.themes
            ]
        })
    }
});

export const useUploadTheme = createMutation<ThemesInstallResponseType, {file: File}>({
    method: 'POST',
    path: () => '/themes/upload/',
    body: ({file}) => {
        const formData = new FormData();
        formData.append('file', file);
        return formData;
    },
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        // Assume that all invite queries should include this new one
        update: (newData, currentData) => (currentData && {
            ...(currentData as ThemesResponseType),
            themes: [
                ...((currentData as ThemesResponseType).themes),
                ...newData.themes
            ]
        })
    }
});

// Helpers

export function isActiveTheme(theme: Theme): boolean {
    return theme.active;
}

export function isDefaultTheme(theme: {name: string}): boolean {
    return theme.name.toLowerCase() === 'source';
}

export function isLegacyTheme(theme: {name: string}): boolean {
    return theme.name.toLowerCase() === 'casper';
}

export function isDefaultOrLegacyTheme(theme: {name: string}): boolean {
    return isDefaultTheme(theme) || isLegacyTheme(theme);
}

export function isDeletableTheme(theme: Theme): boolean {
    return !isDefaultTheme(theme) && !isLegacyTheme(theme) && !isActiveTheme(theme);
}
