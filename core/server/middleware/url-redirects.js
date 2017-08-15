var url = require('url'),
    debug = require('ghost-ignition').debug('url-redirects'),
    utils = require('../utils'),
    urlRedirects,
    _private = {};

_private.redirectUrl = function redirectUrl(options) {
    var redirectTo = options.redirectTo,
        path = options.path,
        query = options.query,
        parts = url.parse(redirectTo);

    return url.format({
        protocol: parts.protocol,
        hostname: parts.hostname,
        port: parts.port,
        pathname: path,
        query: query
    });
};

_private.getAdminRedirectUrl = function getAdminRedirectUrl(options) {
    var blogHostWithProtocol = utils.url.urlFor('home', true),
        adminHostWithProtocol = utils.url.urlFor('admin', true),
        requestedHost = options.requestedHost,
        requestedUrl = options.requestedUrl,
        queryParameters = options.queryParameters,
        secure = options.secure;

    debug('getAdminRedirectUrl', requestedHost, requestedUrl, adminHostWithProtocol);

    // CASE: we only redirect the admin access if `admin.url` is configured
    if (adminHostWithProtocol !== utils.url.urlJoin(blogHostWithProtocol, 'ghost/')) {
        debug('redirect because admin host does not match');

        return _private.redirectUrl({
            redirectTo: adminHostWithProtocol,
            path: requestedUrl,
            query: queryParameters
        });
    }

    // CASE: configured admin url is HTTPS, but request is HTTP
    if (utils.url.isSSL(adminHostWithProtocol) && !secure) {
        debug('redirect because protocol does not match');

        return _private.redirectUrl({
            redirectTo: adminHostWithProtocol,
            path: requestedUrl,
            query: queryParameters
        });
    }
};

_private.getBlogRedirectUrl = function getBlogRedirectUrl(options) {
    var blogHostWithProtocol = utils.url.urlFor('home', true),
        requestedHost = options.requestedHost,
        requestedUrl = options.requestedUrl,
        queryParameters = options.queryParameters,
        secure = options.secure;

    debug('getBlogRedirectUrl', requestedHost, requestedUrl, blogHostWithProtocol);

    // CASE: configured canonical url is HTTPS, but request is HTTP, redirect to requested host + SSL
    if (utils.url.isSSL(blogHostWithProtocol) && !secure) {
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
            requestedUrl: req.originalUrl || req.url,
            queryParameters: req.query,
            secure: req.secure
        });

    if (redirectUrl) {
        debug('url redirect to: ' + redirectUrl);
        return res.redirect(301, redirectUrl);
    }

    debug('no url redirect');
    next();
};

module.exports = urlRedirects;
