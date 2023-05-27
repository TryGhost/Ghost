import {Setting, User} from '../types/api';
import {getGhostPaths} from './helpers';

type ApiQueryParams = {
    limit: string;
    include: string;
    [key: string]: string;
}

type SettingApiQueryParams = {
    group: string;
    [key: string]: string;
}

type Meta = {
    pagination: {
        page: number;
        limit: number;
        pages: number;
        total: number;
        next: number;
        prev: number;
    }
}

export type SettingsResponseType = {
    meta: Meta;
    settings: Setting[];
}
export type UsersResponseType = {
    meta: Meta;
    users: User[];
}

export async function getSettings() {
    const {apiRoot} = getGhostPaths();
    const queryParams: SettingApiQueryParams = {group: 'site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura'};
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
    const data: SettingsResponseType = await response.json();
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

    const data: SettingsResponseType = await response.json();
    return data;
}

export async function getUsers() {
    const {apiRoot} = getGhostPaths();
    const queryParams: ApiQueryParams = {limit: 'all', include: 'roles'};
    const queryString = Object.keys(queryParams).map((key) => {
        return `${key}=${queryParams[key] || ''}`;
    }).join('&');

    const response = await fetch(`${apiRoot}/users/?${queryString}`, {
        headers: {
            'app-pragma': 'no-cache',
            'x-ghost-version': '5.47'
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
    });
    const data: UsersResponseType = await response.json();
    return data;
}
