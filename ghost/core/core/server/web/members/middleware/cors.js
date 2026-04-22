const {URL} = require('url');
const cors = require('cors');
const config = require('../../../../shared/config');

const maxAge = config.get('caching:cors:maxAge');
const ENABLE_CORS = {origin: true, maxAge, credentials: true};
const WILDCARD_CORS = {origin: '*', maxAge};

function isAllowedOrigin(origin) {
    if (!origin || origin === 'null') {
        return false;
    }

    try {
        const originUrl = new URL(origin);

        // allow localhost requests no matter the port
        if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
            return true;
        }

        // allow the configured site host through on any protocol
        const siteUrl = new URL(config.get('url'));
        if (originUrl.host === siteUrl.host) {
            return true;
        }

        // allow the configured admin host through on any protocol
        if (config.get('admin:url')) {
            const adminUrl = new URL(config.get('admin:url'));
            if (originUrl.host === adminUrl.host) {
                return true;
            }
        }
    } catch (e) {
        // unparsable origin
        return false;
    }

    return false;
}

/**
 * @param {import('express').Request} req
 * @param {Function} callback
 */
function corsOptionsDelegate(req, callback) {
    const origin = req.get('origin');

    if (isAllowedOrigin(origin)) {
        return callback(null, ENABLE_CORS);
    } else {
        return callback(null, WILDCARD_CORS);
    }
}

module.exports = cors(corsOptionsDelegate);

