// Contains all path information to be used throughout the codebase.
// Assumes that config.url is set, and is valid

var moment = require('moment-timezone'),
    _ = require('lodash'),
    url = require('url'),
    config = require('../../config/index'),
    settingsCache = require('../../settings/cache'),
    // @TODO: unify this with the path in server/app.js
    API_PATH = '/ghost/api/v0.1/',
    STATIC_IMAGE_URL_PREFIX = 'content/images';

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
    subDirRegex = new RegExp(subDir + '\/' + subDir + '\/');

    return url.replace(subDirRegex, subDir + '/');
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
function createUrl(urlPath, absolute, secure) {
    urlPath = urlPath || '/';
    absolute = absolute || false;
    var base;

    // create base of url, always ends without a slash
    if (absolute) {
        base = getBlogUrl(secure);
    } else {
        base = getSubdir();
    }

    return urlJoin(base, urlPath);
}

/**
 * creates the url path for a post based on blog timezone and permalink pattern
 *
 * @param {JSON} post
 * @returns {string}
 */
function urlPathForPost(post) {
    var output = '',
        permalinks = settingsCache.get('permalinks'),
        primaryTagFallback = config.get('routeKeywords').primaryTagFallback,
        publishedAtMoment = moment.tz(post.published_at || Date.now(), settingsCache.get('active_timezone')),
        tags = {
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
                return post.author.slug;
            },
            primary_tag: function () {
                return post.primary_tag ? post.primary_tag.slug : primaryTagFallback;
            },
            slug: function () {
                return post.slug;
            },
            id: function () {
                return post.id;
            }
        };

    if (post.page) {
        output += '/:slug/';
    } else {
        output += permalinks;
    }

    // replace tags like :slug or :year with actual values
    output = output.replace(/(:[a-z_]+)/g, function (match) {
        if (_.has(tags, match.substr(1))) {
            return tags[match.substr(1)]();
        }
    });

    return output;
}

// ## urlFor
// Synchronous url creation for a given context
// Can generate a url for a named path, given path, or known object (post)
// Determines what sort of context it has been given, and delegates to the correct generation method,
// Finally passing to createUrl, to ensure any subdirectory is honoured, and the url is absolute if needed
// Usage:
// urlFor('home', true) -> http://my-ghost-blog.com/
// E.g. /blog/ subdir
// urlFor({relativeUrl: '/my-static-page/'}) -> /blog/my-static-page/
// E.g. if post object represents welcome post, and slugs are set to standard
// urlFor('post', {...}) -> /welcome-to-ghost/
// E.g. if post object represents welcome post, and slugs are set to date
// urlFor('post', {...}) -> /2014/01/01/welcome-to-ghost/
// Parameters:
// - context - a string, or json object describing the context for which you need a url
// - data (optional) - a json object containing data needed to generate a url
// - absolute (optional, default:false) - boolean whether or not the url should be absolute
// This is probably not the right place for this, but it's the best place for now
// @TODO: rewrite, very hard to read, create private functions!
function urlFor(context, data, absolute) {
    var urlPath = '/',
        secure, imagePathRe,
        knownObjects = ['post', 'tag', 'author', 'image', 'nav'], baseUrl,
        hostname,

        // this will become really big
        knownPaths = {
            home: '/',
            rss: '/rss/',
            api: API_PATH,
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
        // trying to create a url for an object
        if (context === 'post' && data.post) {
            urlPath = data.post.url;
            secure = data.secure;
        } else if (context === 'tag' && data.tag) {
            urlPath = urlJoin('/', config.get('routeKeywords').tag, data.tag.slug, '/');
            secure = data.tag.secure;
        } else if (context === 'author' && data.author) {
            urlPath = urlJoin('/', config.get('routeKeywords').author, data.author.slug, '/');
            secure = data.author.secure;
        } else if (context === 'image' && data.image) {
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
        // slash e. g. the `{{@blog.url}}` helper. See https://github.com/TryGhost/Ghost/issues/8569
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

        // CASE: with or without protocol? If your blog url (or admin url) is configured to http, it's still possible that e.g. nginx allows both https+http.
        // So it depends how you serve your blog. The main focus here is to avoid cors problems.
        // @TODO: rename cors
        if (data && data.cors) {
            if (!urlPath.match(/^https:/)) {
                urlPath = urlPath.replace(/^.*?:\/\//g, '//');
            }
        }

        if (absolute) {
            urlPath = urlPath.replace(/\/$/, '') + API_PATH;
        } else {
            urlPath = API_PATH;
        }
    } else if (_.isString(context) && _.indexOf(_.keys(knownPaths), context) !== -1) {
        // trying to create a url for a named path
        urlPath = knownPaths[context];
    }

    // This url already has a protocol so is likely an external url to be returned
    // or it is an alternative scheme, protocol-less, or an anchor-only path
    if (urlPath && (urlPath.indexOf('://') !== -1 || urlPath.match(/^(\/\/|#|[a-zA-Z0-9\-]+:)/))) {
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

module.exports.getProtectedSlugs = getProtectedSlugs;
module.exports.getSubdir = getSubdir;
module.exports.urlJoin = urlJoin;
module.exports.urlFor = urlFor;
module.exports.isSSL = isSSL;
module.exports.urlPathForPost = urlPathForPost;
module.exports.redirectToAdmin = redirectToAdmin;
module.exports.redirect301 = redirect301;

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
