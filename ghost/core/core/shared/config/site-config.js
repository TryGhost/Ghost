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
    hostSettings: config.get('hostSettings'),
    labs: config.get('labs'),
    contentPath: config.get('paths:contentPath')
});

module.exports = {buildSiteConfig};
