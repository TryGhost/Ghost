var url = require('url'),
    debug = require('debug')('ghost:redirects'),
    utils = require('../utils'),
    urlRedirects;

function redirectUrl(options) {
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
}

/**
 * SSL AND REDIRECTS
 */
urlRedirects = function urlRedirects(req, res, next) {
    var requestedUrl = req.originalUrl || req.url,
        requestedHost = req.get('host'),
        targetHostWithProtocol,
        targetHostWithoutProtocol;

    if (res.isAdmin) {
        targetHostWithProtocol = utils.url.urlFor('admin', true);
        targetHostWithoutProtocol = utils.url.urlFor('admin', {cors: true}, true);
    } else {
        targetHostWithProtocol = utils.url.urlFor('home', true);
        targetHostWithoutProtocol = utils.url.urlFor('home', {cors: true}, true);
    }

    debug('requestedUrl', requestedUrl);
    debug('requestedHost', requestedHost);
    debug('targetHost', targetHostWithoutProtocol);

    // CASE: custom admin url is configured, but user requests blog domain
    // CASE: exception: localhost is always allowed
    if (!targetHostWithoutProtocol.match(new RegExp(requestedHost))) {
        debug('redirect because host does not match');

        return res.redirect(301, redirectUrl({
            redirectTo: targetHostWithProtocol,
            path: requestedUrl,
            query: req.query
        }));
    }

    // CASE: correct admin url, but not the correct protocol
    if (utils.url.isSSL(targetHostWithProtocol) && !req.secure) {
        debug('redirect because protocol does not match');

        return res.redirect(301, redirectUrl({
            redirectTo: targetHostWithProtocol,
            path: requestedUrl,
            query: req.query
        }));
    }

    next();
};

module.exports = urlRedirects;
