import {Meta, createMutation, createQuery} from '../apiRequests';
import {Setting} from '../../types/api';

export type SettingsResponseMeta = Meta & { sent_email_verification?: boolean }

export interface SettingsResponseType {
    meta?: SettingsResponseMeta;
    settings: Setting[];
}

const dataType = 'SettingsResponseType';

export const useBrowseSettings = createQuery<SettingsResponseType>({
    dataType,
    path: '/settings/',
    defaultSearchParams: {
        group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura'
    }
});

export const useEditSettings = createMutation<SettingsResponseType, Setting[]>({
    method: 'PUT',
    path: () => '/settings/',
    body: settings => ({settings}),
    updateQueries: {
        dataType,
        update: newData => newData
    }
});
