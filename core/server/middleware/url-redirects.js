var url = require('url'),
    debug = require('debug')('ghost:url-redirects'),
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

    debug('getAdminRedirectUrl');
    debug('requestedUrl', requestedUrl);
    debug('requestedHost', requestedHost);
    debug('adminHost', adminHostWithProtocol);

    /**
     * @TODO: add back if we enable OAuth again or find an alternative solution
     * See https://github.com/TryGhost/Ghost/issues/8152
     *
     * Background:
     * For oauth we ensure that the served admin url matches the registered oauth redirect uri.
     * If OAuth is enabled again, Ghost registeres a public client with the admin redirect uri.
     * So this url has to be clearly, you can only serve the admin with one single url.
     * And this must be the configured blog url (or admin url if specified)
        if (!admimHostWithoutProtocol.match(new RegExp(requestedHost))) {
            debug('redirect because host does not match');

            return _private.redirectUrl({
                redirectTo: adminHostWithProtocol,
                path: requestedUrl,
                query: queryParameters
            });
        }
     */

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

    debug('getBlogRedirectUrl');
    debug('requestedUrl', requestedUrl);
    debug('requestedHost', requestedHost);
    debug('blogHost', blogHostWithProtocol);

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
