/**
 * @typedef {import('got').Got} Got
 * @typedef {import('got').ExtendOptions} ExtendOptions
 */

const got = /** @type {Got} */ (/** @type {unknown} */ (require('got').default));
const dns = require('dns');
const net = require('net');
const dnsPromises = require('dns').promises;
const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const validator = require('@tryghost/validator');

/**
 * Normalize an IPv4 address from any format (decimal, octal, hex, integer)
 * to standard dotted-decimal notation using the WHATWG URL parser.
 * Returns null if the address is not a valid IPv4 address.
 */
function normalizeIPv4(addr) {
    try {
        const normalized = new URL('http://' + addr + '/').hostname;
        if (net.isIPv4(normalized)) {
            return normalized;
        }
    } catch {
        // URL parsing failed
    }
    return null;
}

/**
 * Normalize an IPv6 address from any expanded form (e.g. 0:0:0:0:0:0:0:1)
 * to compressed notation (e.g. ::1) using the WHATWG URL parser.
 * Returns null if the address is not a valid IPv6 address.
 */
function normalizeIPv6(addr) {
    try {
        const hostname = new URL('http://[' + addr + ']/').hostname;
        // hostname includes brackets, strip them
        const normalized = hostname.slice(1, -1);
        if (net.isIPv6(normalized)) {
            return normalized;
        }
    } catch {
        // URL parsing failed
    }
    return null;
}

/**
 * Check if a normalized (dotted-decimal) IPv4 address falls in a private/reserved range.
 */
function isPrivateIPv4(addr) {
    const parts = addr.split('.');
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);

    // 10.0.0.0/8
    if (a === 10) {
        return true;
    }
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) {
        return true;
    }
    // 192.168.0.0/16
    if (a === 192 && b === 168) {
        return true;
    }
    // 127.0.0.0/8
    if (a === 127) {
        return true;
    }
    // 169.254.0.0/16
    if (a === 169 && b === 254) {
        return true;
    }
    // 100.64.0.0/10 (carrier-grade NAT, RFC 6598)
    if (a === 100 && b >= 64 && b <= 127) {
        return true;
    }
    // 198.18.0.0/15 (benchmarking, RFC 2544)
    if (a === 198 && (b === 18 || b === 19)) {
        return true;
    }
    // 0.0.0.0/8
    if (a === 0) {
        return true;
    }
    // 240.0.0.0/4 (reserved) and 255.255.255.255 (broadcast)
    if (a >= 240) {
        return true;
    }
    return false;
}

function isPrivateIp(addr) {
    // Fail closed: treat missing/empty values as private
    if (!addr) {
        return true;
    }

    // Check for IPv4-mapped IPv6 in dotted notation (e.g. ::ffff:192.168.0.1)
    const v4DottedMatch = addr.match(/^::ffff:(\d[\d.]+)$/i);
    if (v4DottedMatch) {
        const normalized = normalizeIPv4(v4DottedMatch[1]);
        if (normalized) {
            return isPrivateIPv4(normalized);
        }
        return true;
    }

    // Check for IPv4-mapped IPv6 in hex notation (e.g. ::ffff:7f00:1)
    const v4HexMatch = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
    if (v4HexMatch) {
        const hi = parseInt(v4HexMatch[1], 16);
        const lo = parseInt(v4HexMatch[2], 16);
        const mapped = ((hi >> 8) & 0xff) + '.' + (hi & 0xff) + '.' + ((lo >> 8) & 0xff) + '.' + (lo & 0xff);
        return isPrivateIPv4(mapped);
    }

    // Try normalizing as IPv4 (handles decimal, octal, hex, and integer notation)
    const normalized = normalizeIPv4(addr);
    if (normalized) {
        return isPrivateIPv4(normalized);
    }

    // IPv6 checks
    const normalized6 = normalizeIPv6(addr);
    if (normalized6) {
        // ::1 loopback, :: unspecified
        if (normalized6 === '::1' || normalized6 === '::' || normalized6 === '::0') {
            return true;
        }
        // fc00::/7 unique local
        if (/^f[cd][0-9a-f]{2}:/i.test(normalized6)) {
            return true;
        }
        // fe80::/10 link-local
        if (/^fe[89ab][0-9a-f]:/i.test(normalized6)) {
            return true;
        }
        // Re-check for IPv4-mapped IPv6 after normalization
        // Handles expanded forms like 0:0:0:0:0:ffff:127.0.0.1 which normalize to ::ffff:...
        const v4DottedNorm = normalized6.match(/^::ffff:(\d[\d.]+)$/i);
        if (v4DottedNorm) {
            const normV4 = normalizeIPv4(v4DottedNorm[1]);
            if (normV4) {
                return isPrivateIPv4(normV4);
            }
            return true;
        }
        const v4HexNorm = normalized6.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
        if (v4HexNorm) {
            const hi = parseInt(v4HexNorm[1], 16);
            const lo = parseInt(v4HexNorm[2], 16);
            const mapped = ((hi >> 8) & 0xff) + '.' + (hi & 0xff) + '.' + ((lo >> 8) & 0xff) + '.' + (lo & 0xff);
            return isPrivateIPv4(mapped);
        }
        return false;
    }

    // Unrecognized format - fail closed
    return true;
}

async function errorIfHostnameResolvesToPrivateIp(options) {
    // Allow all requests if we are in development mode
    if (config.get('env') === 'development') {
        return;
    }

    // allow requests through to local Ghost instance
    const siteUrl = new URL(config.get('url'));
    const requestUrl = new URL(options.url.href);
    if (requestUrl.host === siteUrl.host) {
        return;
    }

    const result = await dnsPromises.lookup(options.url.hostname);

    if (isPrivateIp(result.address)) {
        return Promise.reject(new errors.InternalServerError({
            message: 'URL resolves to a non-permitted private IP block',
            code: 'URL_PRIVATE_INVALID',
            context: options.url.href
        }));
    }
}

async function errorIfInvalidUrl(options) {
    if (config.get('env') === 'development') {
        return;
    }

    if (!options.url.hostname || !validator.isURL(options.url.hostname)) {
        throw new errors.InternalServerError({
            message: 'URL invalid.',
            code: 'URL_MISSING_INVALID',
            context: options.url.href
        });
    }
}

async function disableRetries(options) {
    // Force disable retries
    options.retry = {
        limit: 0,
        calculateDelay: () => 0
    };
    options.timeout = {
        request: 5000
    };
}

/**
 * Install a custom dnsLookup on the request options that validates the resolved
 * IP at connection time. This eliminates the DNS rebinding / TOCTOU gap between
 * the beforeRequest DNS check and the actual TCP connection: the IP validated
 * here is the same one Node's http module will connect to.
 */
function installSafeDnsLookup(options) {
    if (config.get('env') === 'development') {
        return;
    }

    const siteUrl = new URL(config.get('url'));
    if (options.url.host === siteUrl.host) {
        return;
    }

    const requestHref = options.url.href;
    // Use 'lookup' (the native http.request option) rather than 'dnsLookup'
    // (got's public API property which doesn't flow to the native request).
    options.lookup = (hostname, dnsOpts, callback) => {
        if (typeof dnsOpts === 'function') {
            callback = dnsOpts;
            dnsOpts = {};
        }
        dns.lookup(hostname, dnsOpts, (err, addressOrResult, family) => {
            if (err) {
                return callback(err, addressOrResult, family);
            }
            // When all:true, result is an array of {address, family} objects
            if (dnsOpts && dnsOpts.all) {
                const results = /** @type {{address: string, family: number}[]} */ (addressOrResult);
                for (const entry of results) {
                    if (isPrivateIp(entry.address)) {
                        return callback(new errors.InternalServerError({
                            message: 'URL resolves to a non-permitted private IP block',
                            code: 'URL_PRIVATE_INVALID',
                            context: requestHref
                        }));
                    }
                }
                return callback(null, results);
            }
            if (isPrivateIp(/** @type {string} */ (addressOrResult))) {
                return callback(new errors.InternalServerError({
                    message: 'URL resolves to a non-permitted private IP block',
                    code: 'URL_PRIVATE_INVALID',
                    context: requestHref
                }));
            }
            callback(null, addressOrResult, family);
        });
    };
}

// same as our normal request lib but if any request in a redirect chain resolves
// to a private IP address it will be blocked before the request is made.
// The beforeRequest hooks provide a first-pass DNS check with clear error messages.
// installSafeDnsLookup provides the authoritative gate at the connection layer,
// preventing DNS rebinding attacks where the IP changes between check and connect.
/** @type {ExtendOptions} */
const gotOpts = {
    headers: {
        'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)'
    },
    timeout: {
        request: 10000
    }, // default is no timeout
    hooks: {
        init: process.env.NODE_ENV?.startsWith('test') ? [disableRetries] : [],
        beforeRequest: [errorIfInvalidUrl, errorIfHostnameResolvesToPrivateIp, installSafeDnsLookup],
        beforeRedirect: [errorIfHostnameResolvesToPrivateIp, installSafeDnsLookup]
    }
};

const externalRequest = got.extend(gotOpts);
externalRequest.isPrivateIp = isPrivateIp;
externalRequest._installSafeDnsLookup = installSafeDnsLookup;
module.exports = externalRequest;
