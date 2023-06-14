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

/**
 * Get the URL history when the form is embedded on the site itself.
 */
export function getDefaultUrlHistory() {
    const STORAGE_KEY = 'ghost-history';

    try {
        const historyString = localStorage.getItem(STORAGE_KEY);
        if (historyString) {
            const parsed = JSON.parse(historyString);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (error) {
        // Failed to access localStorage or something related to that.
        // Log a warning, as this shouldn't happen on a modern browser.

        /* eslint-disable no-console */
        console.warn(`[Signup-Form] Failed to load member URL history:`, error);
    }
}

export function getUrlHistory({siteUrl}: {siteUrl: string}): URLHistory {
    // If we are embedded on the site itself, use the default attribution localStorage, just like Portal
    try {
        if (window.location.host === new URL(siteUrl).host) {
            const history = getDefaultUrlHistory();
            if (history) {
                return history;
            }
        }
    } catch (error) {
        // Most likely an invalid siteUrl

        /* eslint-disable no-console */
        console.warn(`[Signup-Form] Failed to load member URL history:`, error);
    }

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
