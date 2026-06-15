import {warn} from '../../../shared/log';

/**
 * Lightweight translator type for the embed. Returns the locale string for `key`,
 * falling back to the key itself if no translation is available.
 */
export type Translator = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Attempt to fetch `{siteUrl}/locales/{locale}/signup-form.json` from the Ghost
 * site. This mirrors the path Ghost serves for each locale's signup-form strings.
 *
 * Falls back to `en` on any error, and ultimately to identity (key → key) when
 * even English fails — so the form remains functional in all network conditions.
 */
export async function loadTranslator(siteUrl: string, locale: string): Promise<Translator> {
    const strings = await fetchStrings(siteUrl, locale);
    return makeTranslator(strings);
}

async function fetchStrings(siteUrl: string, locale: string): Promise<Record<string, string>> {
    const base = siteUrl.replace(/\/$/, '');
    const url = `${base}/public/locales/${locale}/signup-form.json`;

    try {
        const res = await fetch(url, {credentials: 'omit'});
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as Record<string, string>;
    } catch (err) {
        if (locale !== 'en') {
            warn(`[signup-form] locale "${locale}" failed (${(err as Error).message}); falling back to "en"`);
            return fetchStrings(siteUrl, 'en');
        }
        // Both the requested locale and English failed. Return an empty map so
        // `makeTranslator` falls back to returning keys as-is.
        warn('[signup-form] English locale also failed; using key fallback', err);
        return {};
    }
}

function makeTranslator(strings: Record<string, string>): Translator {
    return (key, vars) => {
        const raw = strings[key] ?? key;
        if (!vars) {
            return raw;
        }
        return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
            const v = vars[name];
            return v === undefined ? `{${name}}` : String(v);
        });
    };
}

/**
 * A no-op translator that returns keys as-is. Used while the real locale is loading
 * or as a synchronous fallback before `loadTranslator` resolves.
 */
export const identityTranslator: Translator = (key) => key;
