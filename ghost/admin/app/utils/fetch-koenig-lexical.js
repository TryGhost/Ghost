import config from 'ghost-admin/config/environment';
import {prefixAssetUrl} from 'ghost-admin/utils/asset-base';

export default async function fetchKoenigLexical() {
    if (window['@tryghost/koenig-lexical']) {
        return window['@tryghost/koenig-lexical'];
    }

    const baseUrl = (config.editorUrl || prefixAssetUrl('assets/koenig-lexical/'));
    const url = new URL(`${baseUrl}${config.editorFilename}?v=${config.editorHash}`);

    if (url.protocol === 'http:') {
        await import(`http://${url.host}${url.pathname}${url.search}`);
    } else {
        await import(`https://${url.host}${url.pathname}${url.search}`);
    }

    return window['@tryghost/koenig-lexical'];
}
