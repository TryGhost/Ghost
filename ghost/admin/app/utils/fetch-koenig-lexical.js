import config from 'ghost-admin/config/environment';
import ghostPaths from 'ghost-admin/utils/ghost-paths';

export default async function fetchKoenigLexical() {
    if (window['@tryghost/koenig-lexical']) {
        return window['@tryghost/koenig-lexical'];
    }

    // If we pass an editor URL (the env var from the dev script), use that
    // Else, if we pass a CDN URL, use that
    // Else, use the asset root from the ghostPaths util
    const baseUrl = (config.editorUrl || (config.cdnUrl ? `${config.cdnUrl}assets/koenig-lexical/` : `${ghostPaths().assetRootWithHost}koenig-lexical/`));
    const url = new URL(`${baseUrl}koenig-lexical.umd.js`);

    if (url.protocol === 'http:') {
        await import(`http://${url.host}${url.pathname}`);
    } else {
        await import(`https://${url.host}${url.pathname}`);
    }

    return window['@tryghost/koenig-lexical'];
}
