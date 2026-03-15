import {createMutation, createQuery} from '../utils/api/hooks';
import {Setting} from './settings';

type CustomThemeSettingData =
    { type: 'text', value: string | null, default: string | null } |
    { type: 'color', value: string, default: string } |
    { type: 'image', value: string | null } |
    { type: 'boolean', value: boolean, default: boolean } |
    {
        type: 'select',
        value: string
        default: string
        options: string[]
    };

export type CustomThemeSetting = CustomThemeSettingData & {
    id: string
    key: string
    description?: string
    // homepage and post are the only two groups we handle, but technically theme authors can put other things in package.json
    group?: 'homepage' | 'post' | string
    visibility?: string
}

export const hiddenCustomThemeSettingValue = null;

export interface CustomThemeSettingsResponseType {
    custom_theme_settings: CustomThemeSetting[];
}

const dataType = 'CustomThemeSettingsResponseType';

export const customThemeSettingsDataType = dataType;

export const useBrowseCustomThemeSettings = createQuery<CustomThemeSettingsResponseType>({
    dataType,
    path: '/custom_theme_settings/'
});

export const useEditCustomThemeSettings = createMutation<CustomThemeSettingsResponseType, Setting[]>({
    method: 'PUT',
    path: () => '/custom_theme_settings/',
    body: settings => ({custom_theme_settings: settings}),

    updateQueries: {
        emberUpdateType: 'skip',
        dataType,
        update: newData => newData
    }
});
