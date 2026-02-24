import assetBase from 'ghost-admin/utils/asset-base';
import config from 'ghost-admin/config/environment';

export default async function fetchKoenigLexical() {
    if (window['@tryghost/koenig-lexical']) {
        return window['@tryghost/koenig-lexical'];
    }

    const baseUrl = (config.editorUrl || `${assetBase()}assets/koenig-lexical/`);
    const url = new URL(`${baseUrl}${config.editorFilename}?v=${config.editorHash}`);

    if (url.protocol === 'http:') {
        await import(`http://${url.host}${url.pathname}${url.search}`);
    } else {
        await import(`https://${url.host}${url.pathname}${url.search}`);
    }

    return window['@tryghost/koenig-lexical'];
}
