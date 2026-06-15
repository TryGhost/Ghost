import {warn} from '../../../shared/log';

export type URLHistoryEntry = {
    type?: 'post';
    path?: string;
    time: number;
    referrerSource: string | null;
    referrerMedium: string | null;
    referrerUrl: string | null;
};

export type URLHistory = URLHistoryEntry[];

export interface SignupFormOptions {
    title?: string;
    description?: string;
    icon?: string;
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    site: string;
    labels: string[];
    locale: string;
}

export function isMinimal(options: SignupFormOptions): boolean {
    return !options.title;
}

export function isValidEmail(email: string): boolean {
    const re =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return !!email && re.test(String(email).toLowerCase());
}

/**
 * Get the URL history from sessionStorage when the form is embedded on the
 * Ghost site itself (same host). This matches the attribution tracking that
 * Portal writes.
 */
function getDefaultUrlHistory(): URLHistory | undefined {
    const STORAGE_KEY = 'ghost-history';
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed as URLHistory;
            }
        }
    } catch (err) {
        warn('[signup-form] Failed to load member URL history from sessionStorage:', err);
    }
    return undefined;
}

/**
 * Build the URL history payload for the magic-link request. When the form is
 * embedded on the Ghost site itself we reuse Portal's sessionStorage attribution
 * data. Otherwise we synthesise a single-entry history that attributes the signup
 * to the embedding page with `referrerMedium: 'Embed'`.
 */
export function getUrlHistory({siteUrl}: {siteUrl: string}): URLHistory {
    try {
        if (window.location.host === new URL(siteUrl).host) {
            const history = getDefaultUrlHistory();
            if (history) {
                return history;
            }
        }
    } catch (err) {
        warn('[signup-form] Failed to compare siteUrl host:', err);
    }

    const currentPath =
        window.location.protocol + '//' + window.location.host + window.location.pathname;

    return [
        {
            time: Date.now(),
            referrerSource: window.location.host,
            referrerMedium: 'Embed',
            referrerUrl: currentPath
        }
    ];
}
