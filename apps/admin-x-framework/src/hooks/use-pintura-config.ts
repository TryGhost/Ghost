import {useBrowseConfig} from '../api/config';
import {getSettingValues, useBrowseSettings} from '../api/settings';
import {getGhostPaths} from '../utils/helpers';
import {useMemo} from 'react';

/**
 * Returns a pinturaConfig object ({ jsUrl, cssUrl }) suitable for passing
 * to Koenig's cardConfig, or null when Pintura is not enabled / configured.
 *
 * Koenig handles its own script and CSS loading — this hook only resolves
 * the URLs from settings and host config.
 */
export default function usePinturaConfig(): { jsUrl: string; cssUrl: string } | null {
    const {data: configData} = useBrowseConfig();
    const {data: settingsData} = useBrowseSettings();

    const config = configData?.config;
    const settings = settingsData?.settings ?? null;

    const [pinturaEnabled] = getSettingValues<boolean>(settings, ['pintura']);
    const [pinturaJsUrl] = getSettingValues<string>(settings, ['pintura_js_url']);
    const [pinturaCssUrl] = getSettingValues<string>(settings, ['pintura_css_url']);

    const hostPintura = config?.pintura as { js?: string; css?: string } | undefined;

    return useMemo(() => {
        if (!pinturaEnabled) {
            return null;
        }

        const jsUrl = resolveUrl(hostPintura?.js || pinturaJsUrl);
        const cssUrl = resolveUrl(hostPintura?.css || pinturaCssUrl);

        if (!jsUrl || !cssUrl) {
            return null;
        }

        return {jsUrl, cssUrl};
    }, [pinturaEnabled, pinturaJsUrl, pinturaCssUrl, hostPintura?.js, hostPintura?.css]);
}

function resolveUrl(url: string | null | undefined): string | null {
    if (!url) {
        return null;
    }

    if (url.startsWith('/')) {
        const {adminRoot} = getGhostPaths();
        return window.location.origin + adminRoot.replace(/\/$/, '') + url;
    }

    return url;
}
