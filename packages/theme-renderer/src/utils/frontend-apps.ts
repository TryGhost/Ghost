/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/utils/frontend-apps.js @ 407e032dc7 — transforms: imports→seam
import {config} from '../seam/proxy.ts';

export function getFrontendAppConfig(app: string) {
    const appVersion = config.get(`${app}:version`);
    let scriptUrl = config.get(`${app}:url`);
    let stylesUrl = config.get(`${app}:styles`);
    if (typeof scriptUrl === 'string' && scriptUrl.includes('{version}')) {
        scriptUrl = scriptUrl.replace('{version}', appVersion);
    }
    if (typeof stylesUrl === 'string' && stylesUrl?.includes('{version}')) {
        stylesUrl = stylesUrl.replace('{version}', appVersion);
    }
    return {
        scriptUrl,
        stylesUrl,
        appVersion
    };
}

export function getDataAttributes(data: any) {
    let dataAttributes = '';

    if (!data) {
        return dataAttributes;
    }
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) {
            return;
        }
        dataAttributes += `data-${key}="${value}" `;
    });

    return dataAttributes.trim();
}
