const deduplicateSubdirectory = require('./utils/deduplicate-subdirectory');

/**
 * Returns a subdirectory URL, if defined so in the config.
 * @callback getSubdirFn
 * @return {string} a subdirectory if configured.
 */
function getSubdir() {
    // Parse local path location
    let {pathname} = new URL(this.get('url'));
    let subdir;

    // Remove trailing slash
    if (pathname !== '/') {
        pathname = pathname.replace(/\/$/, '');
    }

    subdir = pathname === '/' ? '' : pathname;
    return subdir;
}

/**
 * Returns the base URL of the site as set in the config.
 *
 * Secure:
 * If the request is secure, we want to force returning the site url as https.
 * Imagine Ghost runs with http, but nginx allows SSL connections.
 *
 * @callback getSiteUrlFn
 * @param {boolean} [secure] optionally force the url to be secure
 * @return {string} returns the url as defined in config, but always with a trailing `/`
 */
function getSiteUrl(secure = false) {
    let siteUrl = this.get('url');

    if (secure) {
        siteUrl = siteUrl.replace('http://', 'https://');
    }

    if (!siteUrl.match(/\/$/)) {
        siteUrl += '/';
    }

    return siteUrl;
}

/**
 *
 * @callback getAdminUrlFn
 * @returns {string} returns the url as defined in config, but always with a trailing `/`
 */
function getAdminUrl() {
    let adminUrl = this.get('admin:url');
    const subdir = this.getSubdir();

    if (!adminUrl) {
        return;
    }

    if (!adminUrl.match(/\/$/)) {
        adminUrl += '/';
    }

    adminUrl = `${adminUrl}${subdir}`;

    if (!adminUrl.match(/\/$/)) {
        adminUrl += '/';
    }

    adminUrl = deduplicateSubdirectory(adminUrl, this.getSiteUrl());
    return adminUrl;
}

module.exports = {
    getSubdir,
    getSiteUrl,
    getAdminUrl
};
