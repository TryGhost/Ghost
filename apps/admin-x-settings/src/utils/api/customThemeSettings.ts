import { CustomThemeSetting, Setting } from '../../types/api';
import { createMutation, createQuery } from '../apiRequests';

export interface CustomThemeSettingsResponseType {
    custom_theme_settings: CustomThemeSetting[];
}

const dataType = 'CustomThemeSettingsResponseType';

export const useBrowseCustomThemeSettings = createQuery<CustomThemeSettingsResponseType>({
    dataType,
    path: '/custom_theme_settings/'
});

export const useEditCustomThemeSettings = createMutation<CustomThemeSettingsResponseType, Setting[]>({
    method: 'PUT',
    path: () => '/custom_theme_settings/',
    body: settings => ({custom_theme_settings: settings}),

    updateQueries: {
        dataType,
        update: newData => newData
    }
});
