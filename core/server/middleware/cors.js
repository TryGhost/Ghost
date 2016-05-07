var cors = require('cors'),
    _ = require('lodash'),
    url = require('url'),
    runtime = require('../utils/runtime'),
    whitelist = [
        'localhost'
    ],
    ENABLE_CORS = {origin: true, maxAge: 86400},
    DISABLE_CORS = {origin: false};

// origins that always match: localhost, local IPs, etc.
whitelist = whitelist.concat(runtime.getIPs());

/**
 * Checks the origin and enables/disables CORS headers in the response.
 * @param  {Object}   req express request object.
 * @param  {Function} cb  callback that configures CORS.
 * @return {null}
 */
function handleCORS(req, cb) {
    var origin = req.get('origin'),
        trustedDomains = req.client && req.client.trustedDomains;

    // Request must have an Origin header
    if (!origin) {
        return cb(null, DISABLE_CORS);
    }

    // Origin matches a client_trusted_domain
    if (_.some(trustedDomains, {trusted_domain: origin})) {
        return cb(null, ENABLE_CORS);
    }

    // Origin matches whitelist
    if ((whitelist.indexOf(url.parse(origin).hostname) > -1) || (whitelist.indexOf(origin) > -1)) {
        return cb(null, ENABLE_CORS);
    }

    return cb(null, DISABLE_CORS);
}

module.exports = function setupCORS(options) {
    if (options && options.whitelist) {
        whitelist = whitelist.concat(options.whitelist);
    }

    return cors(handleCORS);
};
