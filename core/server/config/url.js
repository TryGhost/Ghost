// Contains all path information to be used throughout
// the codebase.

var moment            = require('moment-timezone'),
    _                 = require('lodash'),
    ghostConfig = '',
    // @TODO: unify this with routes.apiBaseUrl
    apiPath = '/ghost/api/v0.1';

// ## setConfig
// Simple utility function to allow
// passing of the ghostConfig
// object here to be used locally
// to ensure clean dependency graph
// (i.e. no circular dependencies).
function setConfig(config) {
    ghostConfig = config;
}

function getBaseUrl(secure) {
    if (secure && ghostConfig.urlSSL) {
        return ghostConfig.urlSSL;
    } else {
        if (secure) {
            return ghostConfig.url.replace('http://', 'https://');
        } else {
            return ghostConfig.url;
        }
    }
}

function urlJoin() {
    var args = Array.prototype.slice.call(arguments),
        prefixDoubleSlash = false,
        subdir = ghostConfig.paths.subdir.replace(/^\/|\/+$/, ''),
        subdirRegex,
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

    // Deduplicate subdirectory
    if (subdir) {
        subdirRegex = new RegExp(subdir + '\/' + subdir + '\/');
        url = url.replace(subdirRegex, subdir + '/');
    }

    return url;
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
// - secure (optional, default:false) - boolean whether or not to use urlSSL or url config
// Returns:
//  - a URL which always ends with a slash
function createUrl(urlPath, absolute, secure) {
    urlPath = urlPath || '/';
    absolute = absolute || false;
    var base;

    // create base of url, always ends without a slash
    if (absolute) {
        base = getBaseUrl(secure);
    } else {
        base = ghostConfig.paths.subdir;
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
        permalinks = ghostConfig.theme.permalinks,
        publishedAtMoment = moment.tz(post.published_at || Date.now(), ghostConfig.theme.timezone),
        tags = {
            year:   function () { return publishedAtMoment.format('YYYY'); },
            month:  function () { return publishedAtMoment.format('MM'); },
            day:    function () { return publishedAtMoment.format('DD'); },
            author: function () { return post.author.slug; },
            slug:   function () { return post.slug; },
            id:     function () { return post.id; }
        };

    if (post.page) {
        output += '/:slug/';
    } else {
        output += permalinks;
    }

    // replace tags like :slug or :year with actual values
    output = output.replace(/(:[a-z]+)/g, function (match) {
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
function urlFor(context, data, absolute) {
    var urlPath = '/',
        secure, imagePathRe,
        knownObjects = ['post', 'tag', 'author', 'image', 'nav'], baseUrl,
        hostname,

    // this will become really big
    knownPaths = {
        home: '/',
        rss: '/rss/',
        api: apiPath,
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
            urlPath = urlJoin('/', ghostConfig.routeKeywords.tag, data.tag.slug, '/');
            secure = data.tag.secure;
        } else if (context === 'author' && data.author) {
            urlPath = urlJoin('/', ghostConfig.routeKeywords.author, data.author.slug, '/');
            secure = data.author.secure;
        } else if (context === 'image' && data.image) {
            urlPath = data.image;
            imagePathRe = new RegExp('^' + ghostConfig.paths.subdir + '/' + ghostConfig.paths.imagesRelPath);
            absolute = imagePathRe.test(data.image) ? absolute : false;
            secure = data.image.secure;

            if (absolute) {
                // Remove the sub-directory from the URL because ghostConfig will add it back.
                urlPath = urlPath.replace(new RegExp('^' + ghostConfig.paths.subdir), '');
                baseUrl = getBaseUrl(secure).replace(/\/$/, '');
                urlPath = baseUrl + urlPath;
            }

            return urlPath;
        } else if (context === 'nav' && data.nav) {
            urlPath = data.nav.url;
            secure = data.nav.secure || secure;
            baseUrl = getBaseUrl(secure);
            hostname = baseUrl.split('//')[1] + ghostConfig.paths.subdir;
            if (urlPath.indexOf(hostname) > -1
                && !urlPath.split(hostname)[0].match(/\.|mailto:/)
                && urlPath.split(hostname)[1].substring(0,1) !== ':') {
                // make link relative to account for possible
                // mismatch in http/https etc, force absolute
                // do not do so if link is a subdomain of blog url
                // or if hostname is inside of the slug
                // or if slug is a port
                urlPath = urlPath.split(hostname)[1];
                if (urlPath.substring(0, 1) !== '/') {
                    urlPath = '/' + urlPath;
                }
                absolute = true;
            }
        }
        // other objects are recognised but not yet supported
    } else if (_.isString(context) && _.indexOf(_.keys(knownPaths), context) !== -1) {
        // trying to create a url for a named path
        urlPath = knownPaths[context] || '/';
    }

    // This url already has a protocol so is likely an external url to be returned
    // or it is an alternative scheme, protocol-less, or an anchor-only path
    if (urlPath && (urlPath.indexOf('://') !== -1 || urlPath.match(/^(\/\/|#|[a-zA-Z0-9\-]+:)/))) {
        return urlPath;
    }

    return createUrl(urlPath, absolute, secure);
}

function apiUrl() {
    // @TODO unify this with urlFor
    var url;

    if (ghostConfig.forceAdminSSL) {
        url = (ghostConfig.urlSSL || ghostConfig.url).replace(/^.*?:\/\//g, 'https://');
    } else if (ghostConfig.urlSSL) {
        url = ghostConfig.urlSSL.replace(/^.*?:\/\//g, 'https://');
    } else if (ghostConfig.url.match(/^https:/)) {
        url = ghostConfig.url;
    } else {
        url = ghostConfig.url.replace(/^.*?:\/\//g, '//');
    }

    return url.replace(/\/$/, '') + apiPath + '/';
}

module.exports.setConfig = setConfig;
module.exports.urlJoin = urlJoin;
module.exports.urlFor = urlFor;
module.exports.urlPathForPost = urlPathForPost;
module.exports.apiUrl = apiUrl;
module.exports.getBaseUrl = getBaseUrl;
