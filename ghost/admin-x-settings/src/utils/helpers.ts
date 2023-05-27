import {Setting, SettingValue} from '../types/api';

export interface IGhostPaths {
    adminRoot: string;
    assetRoot: string;
    apiRoot: string;
}

export function getSettingValue(settings: Setting[] | null | undefined, key: string): SettingValue {
    if (!settings) {
        return '';
    }
    const setting = settings.find(d => d.key === key);
    return setting?.value || null;
}

export function getGhostPaths(): IGhostPaths {
    let path = window.location.pathname;
    let subdir = path.substr(0, path.search('/ghost/'));
    let adminRoot = `${subdir}/ghost/`;
    let assetRoot = `${subdir}/ghost/assets/`;
    let apiRoot = `${subdir}/ghost/api/admin`;
    return {adminRoot, assetRoot, apiRoot};
}

export function getLocalTime(timeZone: string) {
    const date = new Date();
    const options = {timeZone: timeZone};
    const localTime = date.toLocaleString('en-US', options);
    return localTime;
}

export function getOptionLabel(
    options: {value: string; label: string}[], value: string
): string | undefined {
    return options?.find(option => option.value === value)?.label;
}
