const {URL} = require('url');
const cors = require('cors');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');

/**
 * Dynamically configures the expressjs/cors middleware
 *
 * @param {import('express').Request} req
 * @param {Function} callback
 */
function corsOptionsDelegate(req, callback) {
    const origin = req.header('Origin');
    const corsOptions = {
        origin: false, // disallow cross-origin requests by default
        credentials: true, // required to allow admin-client to login to private sites
        maxAge: config.get('caching:cors:maxAge')
    };

    if (!origin || origin === 'null') {
        return callback(null, corsOptions);
    }

    let originUrl;
    try {
        originUrl = new URL(origin);
    } catch (err) {
        return callback(new errors.BadRequestError({err}));
    }

    // originUrl will definitely exist here because according to WHATWG URL spec
    // The class constructor will either throw a TypeError or return a URL object
    // https://url.spec.whatwg.org/#url-class

    // allow all localhost and 127.0.0.1 requests no matter the port
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        corsOptions.origin = true;
    }

    // allow the configured host through on any protocol
    const siteUrl = new URL(config.get('url'));
    if (originUrl.host === siteUrl.host) {
        corsOptions.origin = true;
    }

    // allow the configured admin:url host through on any protocol
    if (config.get('admin:url')) {
        const adminUrl = new URL(config.get('admin:url'));
        if (originUrl.host === adminUrl.host) {
            corsOptions.origin = true;
        }
    }

    callback(null, corsOptions);
}

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {Function} next
 */
const handleCaching = (req, res, next) => {
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
