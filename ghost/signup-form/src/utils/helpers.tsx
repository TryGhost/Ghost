import {SignupFormOptions} from '../AppContext';

export type URLHistory = {
    type?: 'post',
    path?: string,
    time: number,
    referrerSource: string | null,
    referrerMedium: string | null,
    referrerUrl: string | null,
}[];

export function isMinimal(options: SignupFormOptions): boolean {
    return !options.title;
}

export function getUrlHistory(): URLHistory {
    const history: URLHistory = [];

    // Href without query string
    const currentPath = window.location.protocol + '//' + window.location.host + window.location.pathname;
    const currentTime = new Date().getTime();

    history.push({
        time: currentTime,
        referrerSource: window.location.host,
        referrerMedium: 'Embed',
        referrerUrl: currentPath
    });

    return history;
}
