var config = require('../config'),
    url    = require('url'),
    checkSSL;

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
        reqUrl        = url.parse(opt.reqUrl), // expected to be relative-to-root
        baseUrl       = url.parse(opt.configUrlSSL || opt.configUrl),
        response = {
        // Check if forceAdminSSL: { redirect: false } is set, which means
        // we should just deny non-SSL access rather than redirect
        isForbidden: (forceAdminSSL && forceAdminSSL.redirect !== undefined && !forceAdminSSL.redirect),

        redirectUrl: function redirectUrl(query) {
            return url.format({
                protocol: 'https:',
                hostname: baseUrl.hostname,
                port: baseUrl.port,
                pathname: reqUrl.pathname,
                query: query
            });
        }
    };

    return response;
}

// Check to see if we should use SSL
// and redirect if needed
checkSSL = function checkSSL(req, res, next) {
    if (isSSLrequired(res.isAdmin, config.url, config.forceAdminSSL)) {
        if (!req.secure) {
            var response = sslForbiddenOrRedirect({
                forceAdminSSL: config.forceAdminSSL,
                configUrlSSL: config.urlSSL,
                configUrl: config.url,
                reqUrl: req.originalUrl || req.url
            });

            if (response.isForbidden) {
                return res.sendStatus(403);
            } else {
                return res.redirect(301, response.redirectUrl(req.query));
            }
        }
    }
    next();
};

module.exports = checkSSL;
