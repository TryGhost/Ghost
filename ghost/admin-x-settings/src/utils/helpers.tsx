import {ISetting} from '../components/SettingsProvider';

export interface IGhostPaths {
    adminRoot: string;
    assetRoot: string;
    apiRoot: string;
}

export function getSettingValue(settings: ISetting[] | null | undefined, key: string): string {
    if (!settings) {
        return '';
    }
    const setting = settings.find(d => d.key === key);
    return setting ? setting.value : '';
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