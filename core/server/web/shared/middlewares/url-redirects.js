const url = require('url');
const path = require('path');
const debug = require('ghost-ignition').debug('web:shared:mw:url-redirects');
const urlUtils = require('../../../lib/url-utils');

const _private = {};

_private.redirectUrl = (options) => {
    const redirectTo = options.redirectTo;
    const query = options.query;
    const parts = url.parse(redirectTo);
    let pathname = options.path;

    // CASE: ensure we always add a trailing slash to reduce the number of redirects
    // e.g. you are redirected from example.com/ghost to admin.example.com/ghost and Ghost would detect a missing slash and redirect you to /ghost/
    // Exceptions: asset requests
    if (!pathname.match(/\/$/) && !path.extname(pathname)) {
        pathname += '/';
    }

    return url.format({
        protocol: parts.protocol,
        hostname: parts.hostname,
        port: parts.port,
        pathname,
        query
    });
};

_private.getAdminRedirectUrl = (options) => {
    const blogHostWithProtocol = urlUtils.urlFor('home', true);
    const adminHostWithProtocol = urlUtils.urlFor('admin', true);
    const adminHostWithoutProtocol = adminHostWithProtocol.replace(/(^\w+:|^)\/\//, '');
    const blogHostWithoutProtocol = blogHostWithProtocol.replace(/(^\w+:|^)\/\//, '');
    const requestedHost = options.requestedHost;
    const requestedUrl = options.requestedUrl;
    const queryParameters = options.queryParameters;
    const secure = options.secure;

    debug('getAdminRedirectUrl', requestedHost, requestedUrl, adminHostWithoutProtocol, blogHostWithoutProtocol, urlUtils.urlJoin(blogHostWithoutProtocol, 'ghost/'));

    // CASE: we only redirect the admin access if `admin.url` is configured
    // If url and admin.url are not equal AND the requested host does not match, redirect.
    // The first condition is the most important, because it ensures that you have a custom admin url configured,
    // because we don't force an admin redirect if you have a custom url configured, but no admin url.
    if (adminHostWithoutProtocol !== urlUtils.urlJoin(blogHostWithoutProtocol, 'ghost/') &&
        adminHostWithoutProtocol !== urlUtils.urlJoin(requestedHost, urlUtils.getSubdir(), 'ghost/')) {
        debug('redirect because admin host does not match');

        return _private.redirectUrl({
            redirectTo: adminHostWithProtocol,
            path: requestedUrl,
            query: queryParameters
        });
    }

    // CASE: configured admin url is HTTPS, but request is HTTP
    if (urlUtils.isSSL(adminHostWithProtocol) && !secure) {
        debug('redirect because protocol does not match');

        return _private.redirectUrl({
            redirectTo: adminHostWithProtocol,
            path: requestedUrl,
            query: queryParameters
        });
    }
};

_private.getBlogRedirectUrl = (options) => {
    const blogHostWithProtocol = urlUtils.urlFor('home', true);
    const requestedHost = options.requestedHost;
    const requestedUrl = options.requestedUrl;
    const queryParameters = options.queryParameters;
    const secure = options.secure;

    debug('getBlogRedirectUrl', requestedHost, requestedUrl, blogHostWithProtocol);

    // CASE: configured canonical url is HTTPS, but request is HTTP, redirect to requested host + SSL
    if (urlUtils.isSSL(blogHostWithProtocol) && !secure) {
        debug('redirect because protocol does not match');

        return _private.redirectUrl({
            redirectTo: `https://${requestedHost}`,
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
 *
 */
_private.redirect = (req, res, next, redirectFn) => {
    const redirectUrl = redirectFn({
        requestedHost: req.hostname,
        requestedUrl: url.parse(req.originalUrl || req.url).pathname,
        queryParameters: req.query,
        secure: req.secure
    });

    if (redirectUrl) {
        debug(`url redirect to: ${redirectUrl}`);
        return urlUtils.redirect301(res, redirectUrl);
    }

    debug('no url redirect');
    next();
};

/*
 * @deprecated: in favor of adminRedirect (extract public getBlogRedirectUrl method when needed)
 */
const urlRedirects = (req, res, next) => {
    const redirectFn = res.isAdmin ? _private.getAdminRedirectUrl : _private.getBlogRedirectUrl;
    _private.redirect(req, res, next, redirectFn);
};

const adminRedirect = (req, res, next) => {
    _private.redirect(req, res, next, _private.getAdminRedirectUrl);
};

module.exports = urlRedirects;
module.exports.adminRedirect = adminRedirect;
