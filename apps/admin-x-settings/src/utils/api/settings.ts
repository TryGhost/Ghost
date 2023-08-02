import {Meta, createMutation, createQuery} from '../apiRequests';
import {Setting} from '../../types/api';

export type SettingsResponseMeta = Meta & { sent_email_verification?: boolean }

export interface SettingsResponseType {
    meta?: SettingsResponseMeta;
    settings: Setting[];
}

const dataType = 'SettingsResponseType';

function formatSettingsForDisplay(settings: Setting[]): Setting[] {
    return settings.map((setting) => {
        if (setting.key === 'facebook' && setting.value) {
            const value = setting.value as string;
            let [, user] = value.match(/(\S+)/) || [];

            return {
                key: setting.key,
                value: `https://www.facebook.com/${user}`
            };
        }
        if (setting.key === 'twitter' && setting.value) {
            const value = setting.value as string;
            let [, user] = value.match(/@?([^/]*)/) || [];

            return {
                key: setting.key,
                value: `https://twitter.com/${user}`
            };
        }

        return {
            key: setting.key,
            value: setting.value
        };
    });
}

function formatSettingsForApi(settings: Setting[]): Setting[] {
    return settings.map((setting) => {
        if (setting.key === 'facebook' && setting.value) {
            const deserialized = setting.value as string;
            let [, user] = deserialized.match(/(?:https:\/\/)(?:www\.)(?:facebook\.com)\/(?:#!\/)?(\w+\/?\S+)/mi) || [];

            return {
                key: setting.key,
                value: user
            };
        }

        if (setting.key === 'twitter' && setting.value) {
            const deserialized = setting.value as string;
            let [, user] = deserialized.match(/(?:https:\/\/)(?:twitter\.com)\/(?:#!\/)?@?([^/]*)/) || [];

            return {
                key: setting.key,
                value: `@${user}`
            };
        }

        return {
            key: setting.key,
            value: setting.value
        };
    });
}

export const useBrowseSettings = createQuery<SettingsResponseType>({
    dataType,
    path: '/settings/',
    returnData: data => ({
        ...(data as SettingsResponseType),
        settings: formatSettingsForDisplay((data as SettingsResponseType).settings)
    }),
    defaultSearchParams: {
        group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura'
    }
});

export const useEditSettings = createMutation<SettingsResponseType, Setting[]>({
    method: 'PUT',
    path: () => '/settings/',
    body: settings => ({settings: formatSettingsForApi(settings)}),
    updateQueries: {
        dataType,
        update: newData => ({
            ...newData,
            settings: formatSettingsForDisplay(newData.settings)
        })
    }
});

export const useDeleteStripeSettings = createMutation<unknown, null>({
    method: 'DELETE',
    path: () => '/settings/stripe/connect/',
    invalidateQueries: {dataType}
});
