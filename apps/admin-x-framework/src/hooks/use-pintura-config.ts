import {useMemo} from 'react';
import {useBrowseConfig} from '../api/config';
import {getSettingValues, useBrowseSettings} from '../api/settings';
import {getGhostPaths} from '../utils/helpers';

const parseOptionalString = (value: unknown): undefined | string => {
    if (value === null || typeof value === 'undefined') {
        return undefined;
    }
    if (typeof value === 'string') {
        return value;
    }
    throw new TypeError('Expected value to be null, undefined, or a string');
};

const resolveUrl = (url: string): string => {
    if (url.startsWith('/')) {
        const {adminRoot} = getGhostPaths();
        return window.location.origin + adminRoot.replace(/\/$/, '') + url;
    }
    return url;
};

/**
 * Returns the URLs for Pintura, or `null` when Pintura is not
 * enabled/configured.
 *
 * Suitable for passing to Koenig's `cardConfig`. Koenig handles its own script
 * and CSS loading — this hook only resolves the URLs from settings and host
 * config.
 */
export function usePinturaConfig(): { jsUrl: string; cssUrl: string } | null {
    const {data: configData} = useBrowseConfig();
    const {data: settingsData} = useBrowseSettings();

    const config = configData?.config;
    const pinturaConfig = config?.hostSettings?.pintura;
    const settings = settingsData?.settings ?? null;

    const [isEnabled, fallbackJsUrl, fallbackCssUrl] = getSettingValues<unknown>(settings, [
        'pintura',
        'pintura_js_url',
        'pintura_css_url'
    ]);
    let configJsUrl: undefined | string;
    let configCssUrl: undefined | string;
    if (isEnabled) {
        configJsUrl = pinturaConfig?.js || parseOptionalString(fallbackJsUrl);
        configCssUrl = pinturaConfig?.css || parseOptionalString(fallbackCssUrl);
    }

    return useMemo(() => {
        if (!configJsUrl || !configCssUrl) {
            return null;
        }
        return {
            jsUrl: resolveUrl(configJsUrl),
            cssUrl: resolveUrl(configCssUrl)
        };
    }, [configJsUrl, configCssUrl]);
}
