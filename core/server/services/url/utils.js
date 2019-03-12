// Contains all path information to be used throughout the codebase.
// Assumes that config.url is set, and is valid
const moment = require('moment-timezone'),
    _ = require('lodash'),
    url = require('url'),
    cheerio = require('cheerio'),
    config = require('../../config'),
    settingsCache = require('../settings/cache'),
    BASE_API_PATH = '/ghost/api',
    STATIC_IMAGE_URL_PREFIX = 'content/images';

/**
 * Returns API path combining base path and path for specific version asked or deprecated by default
 * @param {Object} options {version} for which to get the path(stable, actice, deprecated),
 * {type} admin|content: defaults to {version: deprecated, type: content}
 * @return {string} API Path for version
 */
function getApiPath(options) {
    const versionPath = getVersionPath(options);
    return `${BASE_API_PATH}${versionPath}`;
}

/**
 * Returns path containing only the path for the specific version asked or deprecated by default
 * @param {Object} options {version} for which to get the path(stable, actice, deprecated),
 * {type} admin|content: defaults to {version: deprecated, type: content}
 * @return {string} API version path
 */
function getVersionPath(options) {
    const apiVersions = config.get('api:versions');
    let requestedVersion = options.version || 'v0.1';
    let requestedVersionType = options.type || 'content';
    let versionData = apiVersions[requestedVersion];
    if (typeof versionData === 'string') {
        versionData = apiVersions[versionData];
    }
    let versionPath = versionData[requestedVersionType];
    return `/${versionPath}/`;
}

/**
 * Returns the base URL of the blog as set in the config.
 *
 * Secure:
 * If the request is secure, we want to force returning the blog url as https.
 * Imagine Ghost runs with http, but nginx allows SSL connections.
 *
 * @param {boolean} secure
 * @return {string} URL returns the url as defined in config, but always with a trailing `/`
 */
function getBlogUrl(secure) {
    var blogUrl;

    if (secure) {
        blogUrl = config.get('url').replace('http://', 'https://');
    } else {
        blogUrl = config.get('url');
    }

    if (!blogUrl.match(/\/$/)) {
        blogUrl += '/';
    }

    return blogUrl;
}

/**
 * Returns a subdirectory URL, if defined so in the config.
 * @return {string} URL a subdirectory if configured.
 */
function getSubdir() {
    // Parse local path location
    var localPath = url.parse(config.get('url')).path,
        subdir;

    // Remove trailing slash
    if (localPath !== '/') {
        localPath = localPath.replace(/\/$/, '');
    }

    subdir = localPath === '/' ? '' : localPath;
    return subdir;
}

function deduplicateSubDir(url) {
    var subDir = getSubdir(),
        subDirRegex;

    if (!subDir) {
        return url;
    }

    subDir = subDir.replace(/^\/|\/+$/, '');
    // we can have subdirs that match TLDs so we need to restrict matches to
    // duplicates that start with a / or the beginning of the url
    subDirRegex = new RegExp('(^|/)' + subDir + '/' + subDir + '/');

    return url.replace(subDirRegex, '$1' + subDir + '/');
}

function getProtectedSlugs() {
    var subDir = getSubdir();

    if (!_.isEmpty(subDir)) {
        return config.get('slugs').protected.concat([subDir.split('/').pop()]);
    } else {
        return config.get('slugs').protected;
    }
}

/** urlJoin
 * Returns a URL/path for internal use in Ghost.
 * @param {string} arguments takes arguments and concats those to a valid path/URL.
 * @return {string} URL concatinated URL/path of arguments.
 */
function urlJoin() {
    var args = Array.prototype.slice.call(arguments),
        prefixDoubleSlash = false,
        url;

    // Remove empty item at the beginning
    if (args[0] === '') {
        args.shift();
    }

    // Handle schemeless protocols
    if (args[0].indexOf('//') === 0) {
        prefixDoubleSlash = true;
    }

    // join the elements using a slash
    url = args.join('/');

    // Fix multiple slashes
    url = url.replace(/(^|[^:])\/\/+/g, '$1/');

    // Put the double slash back at the beginning if this was a schemeless protocol
    if (prefixDoubleSlash) {
        url = url.replace(/^\//, '//');
    }

    url = deduplicateSubDir(url);
    return url;
}

/**
 * admin:url is optional
 */
function getAdminUrl() {
    var adminUrl = config.get('admin:url'),
        subDir = getSubdir();

    if (!adminUrl) {
        return;
    }

    if (!adminUrl.match(/\/$/)) {
        adminUrl += '/';
    }

    adminUrl = urlJoin(adminUrl, subDir, '/');
    adminUrl = deduplicateSubDir(adminUrl);
    return adminUrl;
}

// ## createUrl
// Simple url creation from a given path
// Ensures that our urls contain the subdirectory if there is one
// And are correctly formatted as either relative or absolute
// Usage:
// createUrl('/', true) -> http://my-ghost-blog.com/
// E.g. /blog/ subdir
// createUrl('/welcome-to-ghost/') -> /blog/welcome-to-ghost/
// Parameters:
// - urlPath - string which must start and end with a slash
// - absolute (optional, default:false) - boolean whether or not the url should be absolute
// - secure (optional, default:false) - boolean whether or not to force SSL
// Returns:
//  - a URL which always ends with a slash
function createUrl(urlPath, absolute, secure, trailingSlash) {
    urlPath = urlPath || '/';
    absolute = absolute || false;
    var base;

    // create base of url, always ends without a slash
    if (absolute) {
        base = getBlogUrl(secure);
    } else {
        base = getSubdir();
    }

    if (trailingSlash) {
        if (!urlPath.match(/\/$/)) {
            urlPath += '/';
        }
    }

    return urlJoin(base, urlPath);
}

/**
 * creates the url path for a post based on blog timezone and permalink pattern
 */
function replacePermalink(permalink, resource) {
    let output = permalink,
        primaryTagFallback = 'all',
        publishedAtMoment = moment.tz(resource.published_at || Date.now(), settingsCache.get('active_timezone')),
        permalinkLookUp = {
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
                return resource.primary_author.slug;
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
    output = output.replace(/(:[a-z_]+)/g, function (match) {
        if (_.has(permalinkLookUp, match.substr(1))) {
            return permalinkLookUp[match.substr(1)]();
        }
    });

    return output;
}

// ## urlFor
// Synchronous url creation for a given context
// Can generate a url for a named path and given path.
// Determines what sort of context it has been given, and delegates to the correct generation method,
// Finally passing to createUrl, to ensure any subdirectory is honoured, and the url is absolute if needed
// Usage:
// urlFor('home', true) -> http://my-ghost-blog.com/
// E.g. /blog/ subdir
// urlFor({relativeUrl: '/my-static-page/'}) -> /blog/my-static-page/
// Parameters:
// - context - a string, or json object describing the context for which you need a url
// - data (optional) - a json object containing data needed to generate a url
// - absolute (optional, default:false) - boolean whether or not the url should be absolute
// This is probably not the right place for this, but it's the best place for now
// @TODO: rewrite, very hard to read, create private functions!
function urlFor(context, data, absolute) {
    var urlPath = '/',
        secure, imagePathRe,
        knownObjects = ['image', 'nav'], baseUrl,
        hostname,

        // this will become really big
        knownPaths = {
            home: '/',
            sitemap_xsl: '/sitemap.xsl'
        };

    // Make data properly optional
    if (_.isBoolean(data)) {
        absolute = data;
        data = null;
    }

    // Can pass 'secure' flag in either context or data arg
    secure = (context && context.secure) || (data && data.secure);

    if (_.isObject(context) && context.relativeUrl) {
        urlPath = context.relativeUrl;
    } else if (_.isString(context) && _.indexOf(knownObjects, context) !== -1) {
        if (context === 'image' && data.image) {
            urlPath = data.image;
            imagePathRe = new RegExp('^' + getSubdir() + '/' + STATIC_IMAGE_URL_PREFIX);
            absolute = imagePathRe.test(data.image) ? absolute : false;

            if (absolute) {
                // Remove the sub-directory from the URL because ghostConfig will add it back.
                urlPath = urlPath.replace(new RegExp('^' + getSubdir()), '');
                baseUrl = getBlogUrl(secure).replace(/\/$/, '');
                urlPath = baseUrl + urlPath;
            }

            return urlPath;
        } else if (context === 'nav' && data.nav) {
            urlPath = data.nav.url;
            secure = data.nav.secure || secure;
            baseUrl = getBlogUrl(secure);
            hostname = baseUrl.split('//')[1];

            // If the hostname is present in the url
            if (urlPath.indexOf(hostname) > -1
                // do no not apply, if there is a subdomain, or a mailto link
                && !urlPath.split(hostname)[0].match(/\.|mailto:/)
                // do not apply, if there is a port after the hostname
                && urlPath.split(hostname)[1].substring(0, 1) !== ':') {
                // make link relative to account for possible mismatch in http/https etc, force absolute
                urlPath = urlPath.split(hostname)[1];
                urlPath = urlJoin('/', urlPath);
                absolute = true;
            }
        }
    } else if (context === 'home' && absolute) {
        urlPath = getBlogUrl(secure);

        // CASE: there are cases where urlFor('home') needs to be returned without trailing
        // slash e. g. the `{{@site.url}}` helper. See https://github.com/TryGhost/Ghost/issues/8569
        if (data && data.trailingSlash === false) {
            urlPath = urlPath.replace(/\/$/, '');
        }
    } else if (context === 'admin') {
        urlPath = getAdminUrl() || getBlogUrl();

        if (absolute) {
            urlPath += 'ghost/';
        } else {
            urlPath = '/ghost/';
        }
    } else if (context === 'api') {
        urlPath = getAdminUrl() || getBlogUrl();
        let apiPath = getApiPath({version: 'v0.1', type: 'content'});
        // CASE: with or without protocol? If your blog url (or admin url) is configured to http, it's still possible that e.g. nginx allows both https+http.
        // So it depends how you serve your blog. The main focus here is to avoid cors problems.
        // @TODO: rename cors
        if (data && data.cors) {
            if (!urlPath.match(/^https:/)) {
                urlPath = urlPath.replace(/^.*?:\/\//g, '//');
            }
        }

        if (data && data.version) {
            apiPath = getApiPath({version: data.version, type: data.versionType});
        }

        if (absolute) {
            urlPath = urlPath.replace(/\/$/, '') + apiPath;
        } else {
            urlPath = apiPath;
        }
    } else if (_.isString(context) && _.indexOf(_.keys(knownPaths), context) !== -1) {
        // trying to create a url for a named path
        urlPath = knownPaths[context];
    }

    // This url already has a protocol so is likely an external url to be returned
    // or it is an alternative scheme, protocol-less, or an anchor-only path
    if (urlPath && (urlPath.indexOf('://') !== -1 || urlPath.match(/^(\/\/|#|[a-zA-Z0-9-]+:)/))) {
        return urlPath;
    }

    return createUrl(urlPath, absolute, secure);
}

function isSSL(urlToParse) {
    var protocol = url.parse(urlToParse).protocol;
    return protocol === 'https:';
}

function redirect301(res, redirectUrl) {
    res.set({'Cache-Control': 'public, max-age=' + config.get('caching:301:maxAge')});
    return res.redirect(301, redirectUrl);
}

function redirectToAdmin(status, res, adminPath) {
    var redirectUrl = urlJoin(urlFor('admin'), adminPath, '/');

    if (status === 301) {
        return redirect301(res, redirectUrl);
    }
    return res.redirect(redirectUrl);
}

/**
 * Make absolute URLs
 * @param {string} html
 * @param {string} siteUrl (blog URL)
 * @param {string} itemUrl (URL of current context)
 * @returns {object} htmlContent
 * @description Takes html, blog url and item url and converts relative url into
 * absolute urls. Returns an object. The html string can be accessed by calling `html()` on
 * the variable that takes the result of this function
 */
function makeAbsoluteUrls(html, siteUrl, itemUrl, options = {assetsOnly: false}) {
    const htmlContent = cheerio.load(html, {decodeEntities: false});
    const staticImageUrlPrefixRegex = new RegExp(STATIC_IMAGE_URL_PREFIX);

    // convert relative resource urls to absolute
    ['href', 'src'].forEach(function forEach(attributeName) {
        htmlContent('[' + attributeName + ']').each(function each(ix, el) {
            el = htmlContent(el);

            let attributeValue = el.attr(attributeName);

            // if URL is absolute move on to the next element
            try {
                const parsed = url.parse(attributeValue);

                if (parsed.protocol) {
                    return;
                }

                // Do not convert protocol relative URLs
                if (attributeValue.lastIndexOf('//', 0) === 0) {
                    return;
                }
            } catch (e) {
                return;
            }

            // CASE: don't convert internal links
            if (attributeValue[0] === '#') {
                return;
            }

            if (options.assetsOnly && !attributeValue.match(staticImageUrlPrefixRegex)) {
                return;
            }

            // compose an absolute URL
            // if the relative URL begins with a '/' use the blog URL (including sub-directory)
            // as the base URL, otherwise use the post's URL.
            const baseUrl = attributeValue[0] === '/' ? siteUrl : itemUrl;
            attributeValue = urlJoin(baseUrl, attributeValue);
            el.attr(attributeName, attributeValue);
        });
    });

    return htmlContent;
}

function absoluteToRelative(urlToModify, options) {
    options = options || {};

    const urlObj = url.parse(urlToModify);
    const relativePath = urlObj.pathname;

    if (options.withoutSubdirectory) {
        const subDir = getSubdir();

        if (!subDir) {
            return relativePath;
        }

        const subDirRegex = new RegExp('^' + subDir);
        return relativePath.replace(subDirRegex, '');
    }

    return relativePath;
}

function relativeToAbsolute(url) {
    if (!url.startsWith('/') || url.startsWith('//')) {
        return url;
    }

    return createUrl(url, true);
}

function deduplicateDoubleSlashes(url) {
    return url.replace(/\/\//g, '/');
}

module.exports.absoluteToRelative = absoluteToRelative;
module.exports.relativeToAbsolute = relativeToAbsolute;
module.exports.makeAbsoluteUrls = makeAbsoluteUrls;
module.exports.getProtectedSlugs = getProtectedSlugs;
module.exports.getSubdir = getSubdir;
module.exports.urlJoin = urlJoin;
module.exports.urlFor = urlFor;
module.exports.isSSL = isSSL;
module.exports.replacePermalink = replacePermalink;
module.exports.redirectToAdmin = redirectToAdmin;
module.exports.redirect301 = redirect301;
module.exports.createUrl = createUrl;
module.exports.deduplicateDoubleSlashes = deduplicateDoubleSlashes;
module.exports.getApiPath = getApiPath;
module.exports.getVersionPath = getVersionPath;
module.exports.getBlogUrl = getBlogUrl;

/**
 * If you request **any** image in Ghost, it get's served via
 * http://your-blog.com/content/images/2017/01/02/author.png
 *
 * /content/images/ is a static prefix for serving images!
 *
 * But internally the image is located for example in your custom content path:
 * my-content/another-dir/images/2017/01/02/author.png
 */
module.exports.STATIC_IMAGE_URL_PREFIX = STATIC_IMAGE_URL_PREFIX;
