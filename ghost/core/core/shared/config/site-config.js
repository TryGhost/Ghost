/**
 * The site-level slice of config: everything that varies per site rather than
 * per deployment. Scopes are seeded with this shape; factories must not reach
 * for the nconf singleton.
 */

/**
 * @param {{get: (key: string) => unknown}} config
 */
const buildSiteConfig = config => ({
    url: config.get('url'),
    adminUrl: config.get('admin:url'),
    database: config.get('database'),
    siteUuid: config.get('site_uuid'),
    // Live getter: tests mutate hostSettings at runtime and services read per call
    get hostSettings() {
        return config.get('hostSettings');
    },
    labs: config.get('labs'),
    contentPath: config.get('paths:contentPath'),
    publicContentPath: config.getContentPath('public'),
    dataContentPath: config.getContentPath('data'),
    getSiteUrl: config.getSiteUrl,
    getAdminUrl: config.getAdminUrl,
    getSubdir: config.getSubdir,
    assetBaseUrls: {
        media: config.get('urls:media'),
        files: config.get('urls:files'),
        image: config.get('urls:image')
    },
    protectedSlugs: config.get('slugs').protected,
    redirectCacheMaxAge: config.get('caching:301:maxAge')
});

module.exports = {buildSiteConfig};
