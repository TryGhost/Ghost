import {CustomThemeSetting, Setting} from '../../types/api';
import {createMutation, createQuery} from '../apiRequests';

export interface CustomThemeSettingsResponseType {
    custom_theme_settings: CustomThemeSetting[];
}

const dataType = 'CustomThemeSettingsResponseType';

export const useBrowseCustomThemeSettings = createQuery<CustomThemeSettingsResponseType>({
    dataType,
    path: '/custom_theme_settings/',
    defaultSearchParams: {
        group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura'
    }
});

export const useEditCustomThemeSettings = createMutation<CustomThemeSettingsResponseType, Setting[]>({
    method: 'PUT',
    path: () => '/custom_theme_settings/',
    body: settings => ({settings}),

    updateQueries: {
        dataType,
        update: newData => newData
    }
});
