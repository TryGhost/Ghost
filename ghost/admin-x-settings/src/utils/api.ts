import {Setting} from '../types/api';
import {getGhostPaths} from './helpers';

interface IQueryParams {
    group: string;
    [key: string]: string;
}

// Define the SettingsResponse type
export interface ISettingsResponse {
    meta: any;
    settings: Setting[];
}

export async function getSettings() {
    const {apiRoot} = getGhostPaths();
    const queryParams: IQueryParams = {group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura'};
    const queryString = Object.keys(queryParams).map((key) => {
        return `${key}=${queryParams[key] || ''}`;
    }).join('&');

    const response = await fetch(`${apiRoot}/settings/?${queryString}`, {
        headers: {
            'app-pragma': 'no-cache',
            'x-ghost-version': '5.47'
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
    });
    const data: ISettingsResponse = await response.json();
    return data;
}

export async function updateSettings(newSettings: Setting[]) {
    const {apiRoot} = getGhostPaths();

    const payload = JSON.stringify({
        settings: newSettings
    });

    const response = await fetch(`${apiRoot}/settings/`, {
        headers: {
            'app-pragma': 'no-cache',
            'x-ghost-version': '5.47',
            'Content-Type': 'application/json'
        },
        body: payload,
        method: 'PUT',
        mode: 'cors',
        credentials: 'include'
    });

    const data: ISettingsResponse = await response.json();
    return data;
}
