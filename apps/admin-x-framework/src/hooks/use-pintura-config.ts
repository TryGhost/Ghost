import {type JSONValue, useBrowseConfig} from '../api/config';
import {getSettingValues, useBrowseSettings} from '../api/settings';
import {getGhostPaths} from '../utils/helpers';
import {useMemo} from 'react';

const parseOptionalString = (value: unknown): undefined | string => {
    switch (typeof value) {
    case 'undefined':
    case 'string':
        return value;
    default:
        throw new TypeError('Expected value to be undefined or a string');
    }
};

const parsePinturaConfig = (pinturaConfig: undefined | JSONValue): {
    js: undefined | string,
    css: undefined | string
} => {
    if (pinturaConfig === undefined) {
        return {js: undefined, css: undefined};
    }

    if (pinturaConfig && typeof pinturaConfig === 'object' && !Array.isArray(pinturaConfig) && !(pinturaConfig instanceof Date)) {
        return {
            js: parseOptionalString(pinturaConfig.js),
            css: parseOptionalString(pinturaConfig.css)
        };
    }

    throw new TypeError('Pintura config is of an unexpected type');
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
    const pinturaConfig = parsePinturaConfig(config?.pintura);
    const settings = settingsData?.settings ?? null;

    const [isEnabled, fallbackJsUrl, fallbackCssUrl] = getSettingValues<unknown>(settings, [
        'pintura',
        'pintura_js_url',
        'pintura_css_url'
    ]);
    const configJsUrl = pinturaConfig?.js || parseOptionalString(fallbackJsUrl);
    const configCssUrl = pinturaConfig?.css || parseOptionalString(fallbackCssUrl);

    return useMemo(() => {
        if (!isEnabled) {
            return null;
        }

        if (!configJsUrl || !configCssUrl) {
            return null;
        }

        return {
            jsUrl: resolveUrl(configJsUrl),
            cssUrl: resolveUrl(configCssUrl)
        };
    }, [isEnabled, configJsUrl, configCssUrl]);
}

