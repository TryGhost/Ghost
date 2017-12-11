var url = require('url'),
    debug = require('ghost-ignition').debug('url-redirects'),
    urlService = require('../../services/url'),
    urlRedirects,
    _private = {};

_private.redirectUrl = function redirectUrl(options) {
    var redirectTo = options.redirectTo,
        path = options.path,
        query = options.query,
        parts = url.parse(redirectTo);

    // CASE: ensure we always add a trailing slash to reduce the number of redirects
    // e.g. you are redirected from example.com/ghost to admin.example.com/ghost and Ghost would detect a missing slash and redirect you to /ghost/
    if (!path.match(/\/$/)) {
        path += '/';
    }

    return url.format({
        protocol: parts.protocol,
        hostname: parts.hostname,
        port: parts.port,
        pathname: path,
        query: query
    });
};

_private.getAdminRedirectUrl = function getAdminRedirectUrl(options) {
    var blogHostWithProtocol = urlService.utils.urlFor('home', true),
        adminHostWithProtocol = urlService.utils.urlFor('admin', true),
        adminHostWithoutProtocol = adminHostWithProtocol.replace(/(^\w+:|^)\/\//, ''),
        blogHostWithoutProtocol = blogHostWithProtocol.replace(/(^\w+:|^)\/\//, ''),
        requestedHost = options.requestedHost,
        requestedUrl = options.requestedUrl,
        queryParameters = options.queryParameters,
        secure = options.secure;

    debug('getAdminRedirectUrl', requestedHost, requestedUrl, adminHostWithProtocol);

    // CASE: we only redirect the admin access if `admin.url` is configured
    // If url and admin.url are not equal AND the requested host does not match, redirect.
    // The first condition is the most important, because it ensures that you have a custom admin url configured,
    // because we don't force an admin redirect if you have a custom url configured, but no admin url.
    if (adminHostWithoutProtocol !== urlService.utils.urlJoin(blogHostWithoutProtocol, 'ghost/') &&
        adminHostWithoutProtocol !== urlService.utils.urlJoin(requestedHost, urlService.utils.getSubdir(), 'ghost/')) {
        debug('redirect because admin host does not match');

        return _private.redirectUrl({
            redirectTo: adminHostWithProtocol,
            path: requestedUrl,
            query: queryParameters
        });
    }

    // CASE: configured admin url is HTTPS, but request is HTTP
    if (urlService.utils.isSSL(adminHostWithProtocol) && !secure) {
        debug('redirect because protocol does not match');

        return _private.redirectUrl({
            redirectTo: adminHostWithProtocol,
            path: requestedUrl,
            query: queryParameters
        });
    }
};

_private.getBlogRedirectUrl = function getBlogRedirectUrl(options) {
    var blogHostWithProtocol = urlService.utils.urlFor('home', true),
        requestedHost = options.requestedHost,
        requestedUrl = options.requestedUrl,
        queryParameters = options.queryParameters,
        secure = options.secure;

    debug('getBlogRedirectUrl', requestedHost, requestedUrl, blogHostWithProtocol);

    // CASE: configured canonical url is HTTPS, but request is HTTP, redirect to requested host + SSL
    if (urlService.utils.isSSL(blogHostWithProtocol) && !secure) {
        debug('redirect because protocol does not match');

        return _private.redirectUrl({
            redirectTo: 'https://' + requestedHost,
            path: requestedUrl,
            query: queryParameters
        });
    }
};

/**
 * Takes care of
 *
 * 1. required SSL redirects
 * 2. redirect to the correct admin url
 */
urlRedirects = function urlRedirects(req, res, next) {
    var redirectFn = res.isAdmin ? _private.getAdminRedirectUrl : _private.getBlogRedirectUrl,
        redirectUrl = redirectFn({
            requestedHost: req.get('host'),
            requestedUrl: url.parse(req.originalUrl || req.url).pathname,
            queryParameters: req.query,
            secure: req.secure
        });

    if (redirectUrl) {
        debug('url redirect to: ' + redirectUrl);
        return urlService.utils.redirect301(res, redirectUrl);
    }

    debug('no url redirect');
    next();
};

module.exports = urlRedirects;
