import type {Translator} from '../../types';
import {warn} from '../log';

/**
 * Base subtags of the right-to-left locales Ghost can ship. We match on the
 * primary subtag (before any region/script, e.g. `ar-EG` → `ar`) since i18next's
 * runtime `.dir()` isn't available here — the store loads prebuilt locale JSON.
 */
const RTL_LOCALES = new Set(['ar', 'arc', 'ckb', 'dv', 'fa', 'ha', 'he', 'khw', 'ks', 'ps', 'sd', 'ur', 'yi']);

export type Direction = 'ltr' | 'rtl';

/** Resolve text direction from a locale code. */
export function getDir(locale: string): Direction {
    const base = locale.toLowerCase().split(/[-_]/)[0] ?? '';
    return RTL_LOCALES.has(base) ? 'rtl' : 'ltr';
}

/**
 * Shared i18n instance used by every feature chunk. The shell loads
 * `/locales/{locale}.json` once on init and merges it here. Feature chunks
 * receive `services.t` (a stable function reference) and call it for every string.
 *
 * If a key has no translation (or strings haven't been loaded yet — should never
 * happen because shell blocks on locale fetch), `t()` returns the key itself.
 */

export class I18nStore {
    private strings: Record<string, string> = {};
    private locale = 'en';
    private ready = false;

    setLocale(locale: string, strings: Record<string, string>): void {
        this.locale = locale;
        this.strings = strings;
        this.ready = true;
    }

    isReady(): boolean {
        return this.ready;
    }

    getLocale(): string {
        return this.locale;
    }

    /** Text direction of the resolved locale. */
    dir(): Direction {
        return getDir(this.locale);
    }

    /**
     * Stable bound translator. Pass `i18n.t` to features without worrying about `this`.
     */
    t: Translator = (key, vars) => {
        const raw = this.strings[key] ?? key;
        if (!vars) return raw;
        return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
            const v = vars[name];
            return v === undefined ? `{${name}}` : String(v);
        });
    };
}

/**
 * Fetch the locale JSON for `locale`, falling back to `en` on error. The fallback
 * keeps the shell working even when a locale file is missing during dev or after a
 * stale deploy; the user sees English keys rather than a broken page.
 */
export async function loadLocale(baseUrl: string, locale: string): Promise<{locale: string; strings: Record<string, string>}> {
    const url = `${baseUrl.replace(/\/$/, '')}/locales/${locale}.json`;
    try {
        const res = await fetch(url, {credentials: 'omit'});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const strings = (await res.json()) as Record<string, string>;
        return {locale, strings};
    } catch (err) {
        if (locale === 'en') {
            // Last-resort empty bag. `t()` will return keys as-is, which is the
            // correct fallback per the spec.
            return {locale: 'en', strings: {}};
        }
        warn(`locale ${locale} failed to load (${(err as Error).message}); falling back to en`);
        return loadLocale(baseUrl, 'en');
    }
}
