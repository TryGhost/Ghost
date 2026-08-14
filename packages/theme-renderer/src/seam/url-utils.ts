/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from @tryghost/url-utils@5.2.6 (lib/utils/*.js + lib/UrlUtils.js) — the
// npm package drags Node built-ins (`require('url')`) plus cheerio/remark for the
// html/markdown transforms, so the render-path subset is copied here instead of
// depended on. Transforms: CJS → ESM, `require('url').URL` → global (whatwg)
// `URL`, class → factory taking injected config callbacks, html/markdown/
// mobiledoc/lexical transform methods dropped (not used by the render path).
// See docs/provenance.md.
import _ from '../utils/lodash.ts';
import moment from 'moment-timezone';
import type {UrlUtilsPort} from './types.ts';

// from lib/utils/deduplicate-double-slashes.js
export function deduplicateDoubleSlashes(url: string): string {
    // Preserve protocol slashes (e.g., http://, https://) and only deduplicate
    // slashes in the path portion. The pattern (^|[^:])\/\/+ matches double slashes
    // that are either at the start of the string or not preceded by a colon.
    return url.replace(/(^|[^:])\/\/+/g, '$1/');
}

// from lib/utils/deduplicate-subdirectory.js
export function deduplicateSubdirectory(url: string, rootUrl: string): string {
    // force root url to always have a trailing-slash for consistent behaviour
    if (!rootUrl.endsWith('/')) {
        rootUrl = `${rootUrl}/`;
    }

    const parsedRoot = new URL(rootUrl);

    // do nothing if rootUrl does not have a subdirectory
    if (parsedRoot.pathname === '/') {
        return url;
    }

    const subdir = parsedRoot.pathname.replace(/(^\/|\/$)+/g, '');
    // we can have subdirs that match TLDs so we need to restrict matches to
    // duplicates that start with a / or the beginning of the url
    const subdirRegex = new RegExp(`(^|/)${subdir}/${subdir}(/|$)`);

    return url.replace(subdirRegex, `$1${subdir}/`);
}

// from lib/utils/strip-subdirectory-from-path.js
export function stripSubdirectoryFromPath(path = '', rootUrl = ''): string {
    // force root to always have a trailing-slash for consistent behaviour
    if (!rootUrl.endsWith('/')) {
        rootUrl = `${rootUrl}/`;
    }

    let parsedRoot;
    try {
        parsedRoot = new URL(rootUrl);
    } catch {
        return path;
    }

    // do nothing if rootUrl does not have a subdirectory
    if (parsedRoot.pathname === '/') {
        return path;
    }

    if (path.startsWith(parsedRoot.pathname)) {
        return path.replace(parsedRoot.pathname, '/');
    }

    return path;
}

// from lib/utils/url-join.js
export function urlJoin(parts: any[], options: {rootUrl: string} = {rootUrl: ''}): string {
    let prefixDoubleSlash = false;

    // Remove empty item at the beginning
    if (parts[0] === '') {
        parts.shift();
    }

    // Handle schemeless protocols
    if (String(parts[0]).indexOf('//') === 0) {
        prefixDoubleSlash = true;
    }

    // join the elements using a slash
    let url = parts.join('/');

    // Fix multiple slashes
    url = url.replace(/(^|[^:])\/\/+/g, '$1/');

    // Put the double slash back at the beginning if this was a schemeless protocol
    if (prefixDoubleSlash) {
        url = url.replace(/^\//, '//');
    }

    if (!options.rootUrl) {
        return url;
    }

    return deduplicateSubdirectory(url, options.rootUrl);
}

// from lib/utils/absolute-to-relative.js
export function absoluteToRelative(url: string, rootUrl: string, _options: any = {}): string {
    const defaultOptions = {
        ignoreProtocol: true,
        withoutSubdirectory: false,
        assetsOnly: false,
        staticImageUrlPrefix: 'content/images'
    };
    const options = Object.assign({}, defaultOptions, _options);

    if (options.assetsOnly) {
        const staticImageUrlPrefixRegex = new RegExp(options.staticImageUrlPrefix);
        if (!url.match(staticImageUrlPrefixRegex)) {
            return url;
        }
    }

    let parsedUrl;
    let parsedRoot;

    try {
        parsedUrl = new URL(url, 'http://relative');
        parsedRoot = parsedUrl.origin === 'null' ? undefined : new URL(rootUrl || parsedUrl.origin);
        // return the url as-is if it was relative or non-http
        if (parsedUrl.origin === 'null' || parsedUrl.origin === 'http://relative') {
            return url;
        }
    } catch {
        return url;
    }

    if (!parsedRoot) {
        return url;
    }

    const matchesHost = parsedUrl.host === parsedRoot.host;
    const matchesProtocol = parsedUrl.protocol === parsedRoot.protocol;
    const matchesPath = parsedUrl.pathname.indexOf(parsedRoot.pathname) === 0;

    if (matchesHost && (options.ignoreProtocol || matchesProtocol) && matchesPath) {
        let path = parsedUrl.href.replace(parsedUrl.origin, '');

        if (options.withoutSubdirectory) {
            path = stripSubdirectoryFromPath(path, rootUrl);
        }

        return path;
    }

    return url;
}

// from lib/utils/relative-to-absolute.js
export function relativeToAbsolute(path: string, rootUrl: string, itemPath?: any, _options?: any): string {
    // itemPath is optional, if it's an object it may be the options param instead
    let finalItemPath: string | null = null;
    let finalOptions = _options || {};
    if (typeof itemPath === 'object' && itemPath !== null && !_options) {
        finalOptions = itemPath;
        finalItemPath = null;
    } else if (typeof itemPath === 'string') {
        finalItemPath = itemPath;
    }

    // itemPath could be sent as a full url in which case, extract the pathname
    if (finalItemPath && finalItemPath.match(/^http/)) {
        const itemUrl = new URL(finalItemPath);
        finalItemPath = itemUrl.pathname;
    }

    const defaultOptions = {
        assetsOnly: false,
        staticImageUrlPrefix: 'content/images'
    };
    const options = Object.assign({}, defaultOptions, finalOptions);

    // return the path as-is if it's not an asset path and we're only modifying assets
    if (options.assetsOnly) {
        const staticImageUrlPrefixRegex = new RegExp(options.staticImageUrlPrefix);
        if (!path.match(staticImageUrlPrefixRegex)) {
            return path;
        }
    }

    // if URL is absolute return it as-is
    try {
        const parsed = new URL(path, 'http://relative');

        if (parsed.origin !== 'http://relative') {
            return path;
        }

        // Do not convert protocol relative URLs
        if (path.lastIndexOf('//', 0) === 0) {
            return path;
        }
    } catch {
        return path;
    }

    // return the path as-is if it's a pure hash param
    if (path.startsWith('#')) {
        return path;
    }

    // return the path as-is if it's not root-relative and we have no itemPath
    if (!finalItemPath && !path.match(/^\//)) {
        return path;
    }

    // force root to always have a trailing-slash for consistent behaviour
    if (!rootUrl.endsWith('/')) {
        rootUrl = `${rootUrl}/`;
    }

    const parsedRootUrl = new URL(rootUrl);
    const basePath = path.startsWith('/') ? '' : (finalItemPath || '');
    const fullPath = urlJoin([parsedRootUrl.pathname, basePath, path], {rootUrl});
    const absoluteUrl = new URL(fullPath, rootUrl);

    if (options.secure) {
        absoluteUrl.protocol = 'https:';
    }

    return absoluteUrl.toString();
}

// from lib/utils/replace-permalink.js
export function replacePermalink(permalink: string, resource: any, timezone = 'UTC'): string {
    const primaryTagFallback = 'all';
    const publishedAtMoment = moment.tz(resource.published_at || Date.now(), timezone);
    const permalinkLookUp: Record<string, () => string> = {
        year: function () {
            return publishedAtMoment.format('YYYY');
        },
        month: function () {
            return publishedAtMoment.format('MM');
        },
        day: function () {
            return publishedAtMoment.format('DD');
        },
        author: function () {
            return resource.primary_author?.slug ?? 'undefined';
        },
        primary_author: function () {
            return resource.primary_author ? resource.primary_author.slug : primaryTagFallback;
        },
        primary_tag: function () {
            return resource.primary_tag ? resource.primary_tag.slug : primaryTagFallback;
        },
        slug: function () {
            return resource.slug;
        },
        id: function () {
            return resource.id;
        }
    };

    // replace tags like :slug or :year with actual values
    const permalinkKeys = Object.keys(permalinkLookUp);
    return permalink.replace(/(:[a-z_]+)/g, function (match) {
        const key = match.slice(1);
        if (permalinkKeys.includes(key)) {
            // Known route segment - use the lookup function
            return permalinkLookUp[key]!();
        }
        // Unknown route segment - return 'undefined' string
        return 'undefined';
    });
}

export interface CreateUrlUtilsOptions {
    getSiteUrl: () => string;
    getAdminUrl?: () => string | undefined;
    getSubdir?: () => string;
    staticImageUrlPrefix?: string;
    baseApiPath?: string;
    defaultApiType?: 'content' | 'admin';
}

/**
 * Factory over the copied UrlUtils class methods the render path needs:
 * urlJoin, createUrl, urlFor, absoluteToRelative, relativeToAbsolute,
 * replacePermalink. Method bodies are copied from lib/UrlUtils.js.
 */
export function createUrlUtils(options: CreateUrlUtilsOptions): UrlUtilsPort {
    const config = {
        baseApiPath: options.baseApiPath ?? '/ghost/api',
        defaultApiType: options.defaultApiType ?? 'content',
        staticImageUrlPrefix: options.staticImageUrlPrefix ?? 'content/images'
    };
    const getSiteUrl = options.getSiteUrl;
    const getAdminUrl = options.getAdminUrl || (() => undefined);
    const getSubdir = options.getSubdir || (() => {
        const pathname = new URL(getSiteUrl()).pathname;
        return pathname === '/' ? '' : pathname.replace(/\/$/, '');
    });

    // from lib/UrlUtils.js urlJoin
    function instanceUrlJoin(...parts: any[]): string {
        return urlJoin(parts, {rootUrl: getSiteUrl()});
    }

    // from lib/UrlUtils.js createUrl
    function createUrl(urlPath = '/', absolute = false, trailingSlash?: boolean): string {
        let base;

        // create base of url, always ends without a slash
        if (absolute) {
            base = getSiteUrl();
        } else {
            base = getSubdir();
        }

        if (trailingSlash) {
            if (!urlPath.match(/\/$/)) {
                urlPath += '/';
            }
        }

        return instanceUrlJoin(base, urlPath);
    }

    // from lib/UrlUtils.js urlFor
    function urlFor(context: any, data?: any, absolute?: boolean): string {
        let urlPath = '/';
        let imagePathRe;
        const knownObjects = ['image', 'nav'];
        let baseUrl;
        let hostname;

        // this will become really big
        const knownPaths: Record<string, string> = {
            home: '/',
            sitemap_xsl: '/sitemap.xsl'
        };

        // Make data properly optional
        if (_.isBoolean(data)) {
            absolute = data;
            data = null;
        }

        if (_.isObject(context) && !_.isArray(context) && 'relativeUrl' in context && typeof (context as any).relativeUrl === 'string') {
            const relativeUrl = (context as any).relativeUrl;
            urlPath = relativeUrl || '/';
        } else if (_.isString(context) && _.indexOf(knownObjects, context) !== -1) {
            if (context === 'image' && data && typeof data === 'object' && !_.isArray(data) && 'image' in data && typeof data.image === 'string') {
                urlPath = data.image;
                imagePathRe = new RegExp('^' + getSubdir() + '/' + config.staticImageUrlPrefix);
                absolute = imagePathRe.test(urlPath) ? (absolute || false) : false;

                if (absolute) {
                    // Remove the sub-directory from the URL because ghostConfig will add it back.
                    urlPath = urlPath.replace(new RegExp('^' + getSubdir()), '');
                    baseUrl = getSiteUrl().replace(/\/$/, '');
                    urlPath = baseUrl + urlPath;
                }

                return urlPath;
            } else if (context === 'nav' && data && typeof data === 'object' && !_.isArray(data) && 'nav' in data && data.nav && typeof data.nav === 'object' && !_.isArray(data.nav) && 'url' in data.nav && typeof data.nav.url === 'string') {
                urlPath = data.nav.url;
                baseUrl = getSiteUrl();
                hostname = baseUrl.split('//')[1] as string;

                // If the hostname is present in the url
                if (urlPath.indexOf(hostname) > -1
                    // do no not apply, if there is a subdomain, or a mailto link
                    && !urlPath.split(hostname)[0]!.match(/\.|mailto:/)
                    // do not apply, if there is a port after the hostname
                    && urlPath.split(hostname)[1]!.substring(0, 1) !== ':') {
                    // make link relative to account for possible mismatch in http/https etc, force absolute
                    urlPath = urlPath.split(hostname)[1] as string;
                    urlPath = instanceUrlJoin('/', urlPath);
                    absolute = true;
                }
            }
        } else if (context === 'home' && absolute) {
            urlPath = getSiteUrl();

            // CASE: there are cases where urlFor('home') needs to be returned without trailing
            // slash e. g. the `{{@site.url}}` helper. See https://github.com/TryGhost/Ghost/issues/8569
            if (data && typeof data === 'object' && !_.isArray(data) && 'trailingSlash' in data && data.trailingSlash === false) {
                urlPath = urlPath.replace(/\/$/, '');
            }
        } else if (context === 'admin') {
            const adminUrl = getAdminUrl() || getSiteUrl();
            const adminPath = '/ghost/';

            if (absolute) {
                urlPath = instanceUrlJoin(adminUrl, adminPath);
            } else {
                urlPath = adminPath;
            }
        } else if (context === 'api') {
            const adminUrl = getAdminUrl() || getSiteUrl();
            let apiPath = config.baseApiPath + '/';

            if (data && typeof data === 'object' && !_.isArray(data) && 'type' in data && typeof data.type === 'string' && ['admin', 'content'].includes(data.type)) {
                apiPath += data.type;
            } else {
                apiPath += config.defaultApiType;
            }

            // Ensure we end with a trailing slash
            apiPath += '/';

            if (absolute) {
                urlPath = instanceUrlJoin(adminUrl, apiPath);
            } else {
                urlPath = apiPath;
            }
        } else if (_.isString(context) && _.indexOf(_.keys(knownPaths), context) !== -1) {
            // trying to create a url for a named path
            urlPath = knownPaths[context] as string;
        }

        // This url already has a protocol so is likely an external url to be returned
        // or it is an alternative scheme, protocol-less, or an anchor-only path
        if (urlPath && (urlPath.indexOf('://') !== -1 || urlPath.match(/^(\/\/|#|[a-zA-Z0-9-]+:)/))) {
            return urlPath;
        }

        return createUrl(urlPath, absolute);
    }

    // from lib/UrlUtils.js isSiteUrl
    function isSiteUrl(url: URL, context = 'home'): boolean {
        const siteUrl = new URL(urlFor(context, true));
        if (siteUrl.host === url.host) {
            if (url.pathname.startsWith(siteUrl.pathname)) {
                return true;
            }
            return false;
        }
        return false;
    }

    return {
        urlFor,
        urlJoin: instanceUrlJoin,
        getSiteUrl,
        getAdminUrl,
        getSubdir,
        createUrl,
        isSiteUrl,
        relativeToAbsolute(url: string, opts?: any) {
            // Original code passes options as third parameter (itemPath), preserving that behavior
            return relativeToAbsolute(url, getSiteUrl(), opts || null, undefined);
        },
        absoluteToRelative(url: string, opts?: any) {
            return absoluteToRelative(url, getSiteUrl(), opts);
        },
        replacePermalink,
        STATIC_IMAGE_URL_PREFIX: config.staticImageUrlPrefix
    };
}
