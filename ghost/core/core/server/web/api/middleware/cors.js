const cors = require('cors');
const url = require('url');
const os = require('os');
const urlUtils = require('../../../../shared/url-utils');
const config = require('../../../../shared/config');

let allowlist = [];
const ENABLE_CORS = {origin: true, maxAge: config.get('caching:cors:maxAge')};
const DISABLE_CORS = {origin: false};

/**
 * Gather a list of local ipv4 addresses
 * @return {Array<String>}
 */
function getIPs() {
    const ifaces = os.networkInterfaces();

    const ips = [
        'localhost'
    ];

    Object.keys(ifaces).forEach((ifname) => {
        ifaces[ifname].forEach((iface) => {
            // only support IPv4
            if (iface.family !== 'IPv4') {
                return;
            }

            ips.push(iface.address);
        });
    });

    return ips;
}

function getUrls() {
    const blogHost = url.parse(urlUtils.urlFor('home', true)).hostname;
    const adminHost = url.parse(urlUtils.urlFor('admin', true)).hostname;
    const urls = [];

    urls.push(blogHost);

    if (adminHost !== blogHost) {
        urls.push(adminHost);
    }

    return urls;
}

function getAllowlist() {
    // This needs doing just one time after init
    if (allowlist.length === 0) {
        // origins that always match: localhost, local IPs, etc.
        allowlist = allowlist.concat(getIPs());
        // Trusted urls from config.js
        allowlist = allowlist.concat(getUrls());
    }

    return allowlist;
}

/**
 * Checks the origin and enables/disables CORS headers in the response.
 * @param  {Object}   req express request object.
 * @param  {Function} cb  callback that configures CORS.
 * @return {null}
 */
function corsOptionsDelegate(req, cb) {
    const origin = req.get('origin');

    // Request must have an Origin header
    if (!origin || origin === 'null') {
        return cb(null, DISABLE_CORS);
    }

    // Origin matches allowlist
    if (getAllowlist().indexOf(url.parse(origin).hostname) > -1) {
        return cb(null, ENABLE_CORS);
    }

    return cb(null, DISABLE_CORS);
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
const handleCaching = function handleCaching(req, res, next) {
    const method = req.method && req.method.toUpperCase && req.method.toUpperCase();
    if (method === 'OPTIONS') {
        // @NOTE: try to add native support for dynamic 'vary' header value in 'cors' module
        res.vary('Origin');
    }
    next();
};

module.exports = [
    handleCaching,
    cors(corsOptionsDelegate)
];
