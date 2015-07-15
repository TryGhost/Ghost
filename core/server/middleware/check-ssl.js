var config = require('../config'),
    url    = require('url');

function isSSLrequired(isAdmin, configUrl, forceAdminSSL) {
    var forceSSL = url.parse(configUrl).protocol === 'https:' ? true : false;
    if (forceSSL || (isAdmin && forceAdminSSL)) {
        return true;
    }
    return false;
}

// The guts of checkSSL. Indicate forbidden or redirect according to configuration.
// Required args: forceAdminSSL, url and urlSSL should be passed from config. reqURL from req.url
function sslForbiddenOrRedirect(opt) {
    var forceAdminSSL = opt.forceAdminSSL,
        reqUrl        = opt.reqUrl, // expected to be relative-to-root
        baseUrl       = url.parse(opt.configUrlSSL || opt.configUrl),
        response = {
        // Check if forceAdminSSL: { redirect: false } is set, which means
        // we should just deny non-SSL access rather than redirect
        isForbidden: (forceAdminSSL && forceAdminSSL.redirect !== undefined && !forceAdminSSL.redirect),

        // Append the request path to the base configuration path, trimming out a double "//"
        redirectPathname: function redirectPathname() {
            var pathname  = baseUrl.path;
            if (reqUrl[0] === '/' && pathname[pathname.length - 1] === '/') {
                pathname += reqUrl.slice(1);
            } else {
                pathname += reqUrl;
            }
            return pathname;
        },
        redirectUrl: function redirectUrl(query) {
            return url.format({
                protocol: 'https:',
                hostname: baseUrl.hostname,
                port: baseUrl.port,
                pathname: this.redirectPathname(),
                query: query
            });
        }
    };

    return response;
}

// Check to see if we should use SSL
// and redirect if needed
function checkSSL(req, res, next) {
    if (isSSLrequired(res.isAdmin, config.url, config.forceAdminSSL)) {
        if (!req.secure) {
            var response = sslForbiddenOrRedirect({
                forceAdminSSL: config.forceAdminSSL,
                configUrlSSL: config.urlSSL,
                configUrl: config.url,
                reqUrl: req.url
            });

            if (response.isForbidden) {
                return res.sendStatus(403);
            } else {
                return res.redirect(301, response.redirectUrl(req.query));
            }
        }
    }
    next();
}

module.exports = checkSSL;
// SSL helper functions are exported primarily for unit testing.
module.exports.isSSLrequired = isSSLrequired;
module.exports.sslForbiddenOrRedirect = sslForbiddenOrRedirect;
