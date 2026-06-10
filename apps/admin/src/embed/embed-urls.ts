/**
 * URL construction for the embedded iframe screens (/site, /pro, /explore,
 * /migrate). Ported from the Ember implementations:
 * - gh-site-iframe.js (srcUrl)
 * - services/billing.js (getIframeURL)
 * - services/explore.js (iframeURL, apiUrl)
 * - services/migrate.js (getIframeURL, apiUrl)
 */

export const EXPLORE_URL = "https://ghost.org/explore/";
export const EXPLORE_SUBMIT_ROUTE = "submit";
export const MIGRATE_URL = "https://migrate.ghost.org";

/**
 * The front-end site URL rendered on /site. `admin=1` marks the request as
 * coming from the admin (skips caching layers), `admin_toolbar=0` hides the
 * front-end admin toolbar (the iframe lives inside the admin chrome already)
 * and `v=<guid>` busts the iframe back to the homepage on re-navigation.
 */
export function buildSiteSrcUrl(blogUrl: string, guid?: string): string {
    const srcUrl = new URL(`${blogUrl.replace(/\/+$/, "")}/`);

    if (guid) {
        srcUrl.searchParams.set("v", guid);
    }

    srcUrl.searchParams.set("admin", "1");
    srcUrl.searchParams.set("admin_toolbar", "0");

    return srcUrl.href;
}

/**
 * The Billing (BMA) iframe URL. Appends any child route in the admin hash
 * beyond `#/pro` (including query params, e.g. `?action=checkout`) to the
 * configured billing app URL, mirroring services/billing.js getIframeURL.
 */
export function buildBillingIframeSrc(billingUrl: string, hash: string): string {
    let url = billingUrl;

    if (hash && hash.includes("#/pro")) {
        const destinationRoute = hash.replace("#/pro", "");

        if (destinationRoute) {
            url += destinationRoute;
        }
    }

    return url;
}

/**
 * The Ghost Explore iframe URL. Sub paths (categories, search) are appended;
 * `connect` is an admin-rendered screen and never used as the iframe src.
 */
export function buildExploreIframeSrc(subPath?: string): string {
    let url = EXPLORE_URL;

    if (subPath && !subPath.includes("connect")) {
        url += subPath.replace(/^\//, "");
    }

    return url;
}

/**
 * The site API URL sent to Explore — host + subdirectory, without protocol or
 * trailing slash (services/explore.js apiUrl).
 */
export function buildExploreApiUrl(origin: string, subdir: string): string {
    const host = new URL(origin).host;
    const url = `${host}${subdir}`;

    return url.replace(/\/+$/, "");
}

/**
 * The migration app iframe URL, optionally preselecting a platform via the
 * /migrate/:platform sub route (services/migrate.js getIframeURL).
 */
export function buildMigrateIframeSrc(platform?: string): string {
    let url = MIGRATE_URL;

    if (platform) {
        url += `?platform=${platform}`;
    }

    return url;
}

/**
 * The admin API URL sent to the migration app — origin + subdir + /ghost,
 * without a trailing slash (services/migrate.js apiUrl).
 */
export function buildMigrateApiUrl(origin: string, adminRoot: string): string {
    return `${origin}${adminRoot}`.replace(/\/+$/, "");
}
