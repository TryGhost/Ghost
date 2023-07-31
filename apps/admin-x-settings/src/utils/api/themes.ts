import { InstalledTheme, Theme } from '../../types/api';
import { createMutation, createQuery } from '../apiRequests';

export interface ThemesResponseType {
    themes: Theme[];
}

export interface ThemesInstallResponseType {
    themes: InstalledTheme[];
}

const dataType = 'ThemesResponseType';

const updateThemes = (newData: ThemesResponseType, currentData: unknown) => ({
    ...(currentData as ThemesResponseType),
    themes: (currentData as ThemesResponseType).themes.map((theme) => {
        const newTheme = newData.themes.find(({name}) => name === theme.name);
        return newTheme || theme;
    })
});

export const useBrowseThemes = createQuery<ThemesResponseType>({
    dataType,
    path: '/themes/',
    defaultSearchParams: {limit: 'all', include: 'roles'}
});

export const useActivateTheme = createMutation<ThemesResponseType, string>({
    method: 'PUT',
    path: name => `/themes/${name}/activate/`,
    updateQueries: {
        dataType,
        update: updateThemes
    }
});

export const useDeleteTheme = createMutation<unknown, string>({
    method: 'DELETE',
    path: name => `/themes/${name}`,
    updateQueries: {
        dataType,
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
    invalidateQueries: {dataType}
});

export const useUploadTheme = createMutation<ThemesInstallResponseType, {file: File}>({
    method: 'POST',
    path: () => '/themes/upload/',
    body: ({file}) => {
        const formData = new FormData();
        formData.append('file', file);
        return formData;
    },
    invalidateQueries: {dataType}
});
