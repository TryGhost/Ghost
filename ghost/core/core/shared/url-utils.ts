import UrlUtils from '@tryghost/url-utils';
import config from './config';

const BASE_API_PATH = '/ghost/api';
const urlUtils = new UrlUtils({
    getSubdir: config.getSubdir,
    getSiteUrl: config.getSiteUrl,
    getAdminUrl: config.getAdminUrl as () => string,
    assetBaseUrls: {
        media: config.get('urls:media'),
        files: config.get('urls:files'),
        image: config.get('urls:image')
    },
    slugs: config.get('slugs').protected,
    redirectCacheMaxAge: config.get('caching:301:maxAge'),
    baseApiPath: BASE_API_PATH
});

export default urlUtils;
export {BASE_API_PATH};
