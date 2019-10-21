const cors = require('cors');
const url = require('url');
const os = require('os');
const urlUtils = require('../../../../lib/url-utils');

let whitelist = [];
const ENABLE_CORS = {origin: true, maxAge: 86400};
const DISABLE_CORS = {origin: false};

/**
 * Gather a list of local ipv4 addresses
 * @return {Array<String>}
 */
function getIPs() {
    const ifaces = os.networkInterfaces(),
        ips = [
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

function getWhitelist() {
    // This needs doing just one time after init
    if (whitelist.length === 0) {
        // origins that always match: localhost, local IPs, etc.
        whitelist = whitelist.concat(getIPs());
        // Trusted urls from config.js
        whitelist = whitelist.concat(getUrls());
    }

    return whitelist;
}

/**
 * Checks the origin and enables/disables CORS headers in the response.
 * @param  {Object}   req express request object.
 * @param  {Function} cb  callback that configures CORS.
 * @return {null}
 */
function handleCORS(req, cb) {
    const origin = req.get('origin');

    // Request must have an Origin header
    if (!origin) {
        return cb(null, DISABLE_CORS);
    }

    // Origin matches whitelist
    if (getWhitelist().indexOf(url.parse(origin).hostname) > -1) {
        return cb(null, ENABLE_CORS);
    }

    return cb(null, DISABLE_CORS);
}

module.exports = cors(handleCORS);
