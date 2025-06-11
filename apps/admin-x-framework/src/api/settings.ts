import {Meta, createMutation, createQuery} from '../utils/api/hooks';
import {Config} from './config';

// Types

export type SettingValue = string | boolean | null;

export type Setting = {
    key: string;
    value: SettingValue;
    is_read_only?: boolean;
}

export type SettingsResponseMeta = Meta & {
    filters?: {
        group?: string;
    };
    sent_email_verification?: boolean;
}

export interface SettingsResponseType {
    meta?: SettingsResponseMeta;
    settings: Setting[];
}

// Requests

const dataType = 'SettingsResponseType';

export const useBrowseSettings = createQuery<SettingsResponseType>({
    dataType,
    path: '/settings/',
    defaultSearchParams: {
        group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura,donations,security'
    }
});

export const useEditSettings = createMutation<SettingsResponseType, Setting[]>({
    method: 'PUT',
    path: () => '/settings/',
    body: settings => ({settings: settings.map(({key, value}) => ({key, value}))}),
    updateQueries: {
        dataType,
        emberUpdateType: 'createOrUpdate',
        update: newData => ({
            ...newData,
            settings: newData.settings
        })
    }
});

export const useDeleteStripeSettings = createMutation<unknown, null>({
    method: 'DELETE',
    path: () => '/settings/stripe/connect/',
    invalidateQueries: {dataType}
});

export const useTestSlack = createMutation<unknown, null>({
    method: 'POST',
    path: () => '/slack/test/'
});

// Helpers

export function humanizeSettingKey(key: string) {
    const allCaps = ['API', 'CTA', 'RSS'];

    return key
        .replace(/^[a-z]/, char => char.toUpperCase())
        .replace(/_/g, ' ')
        .replace(new RegExp(`\\b(${allCaps.join('|')})\\b`, 'ig'), match => match.toUpperCase());
}

export function getSettingValues<ValueType = SettingValue>(settings: Setting[] | null, keys: string[]): Array<ValueType | undefined> {
    return keys.map(key => settings?.find(setting => setting.key === key)?.value) as ValueType[];
}

export function getSettingValue<ValueType = SettingValue>(settings: Setting[] | null | undefined, key: string): ValueType | null {
    if (!settings) {
        return null;
    }
    const setting = settings.find(d => d.key === key);
    return setting?.value as ValueType || null;
}

export function isSettingReadOnly(settings: Setting[] | null | undefined, key: string): boolean | undefined {
    if (!settings) {
        return undefined;
    }
    const setting = settings.find(d => d.key === key);
    return setting?.is_read_only || false;
}

export function checkStripeEnabled(settings: Setting[], config: Config) {
    const hasSetting = (key: string) => settings.some(setting => setting.key === key && setting.value);

    const hasDirectKeys = hasSetting('stripe_secret_key') && hasSetting('stripe_publishable_key');
    const hasConnectKeys = hasSetting('stripe_connect_secret_key') && hasSetting('stripe_connect_publishable_key');

    if (config.stripeDirect) {
        return hasDirectKeys;
    }

    return hasConnectKeys || hasDirectKeys;
}
