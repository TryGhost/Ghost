/**
 * @typedef {import('got').Got} Got
 * @typedef {import('got').ExtendOptions} ExtendOptions
 */

const got = /** @type {Got} */ (/** @type {unknown} */ (require('got').default));
const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');
const dnsPromises = require('dns').promises;
const errors = require('@tryghost/errors');
const config = require('../../shared/config');
const validator = require('@tryghost/validator');
const ipaddr = require('ipaddr.js');
const _ = require('lodash');

// Shared keep-alive agents so outbound HTTPS connections are pooled and reused
// across page renders / oEmbed / webmention / recommendations / image probes.
// Without this, each request opens a fresh socket which on a NAT-gatewayed VPC
// holds the gateway at its connection-rate ceiling and causes port-collision drops.
// Pool sizing is configurable via `externalRequest` (see config defaults).
const agentOptions = {
  keepAlive: config.get('externalRequest:keepAlive') ?? true,
  keepAliveMsecs: config.get('externalRequest:keepAliveMsecs') ?? 60000,
  maxSockets: config.get('externalRequest:maxSockets') ?? 256,
  maxFreeSockets: config.get('externalRequest:maxFreeSockets') ?? 256,
};
const httpAgent = new http.Agent(agentOptions);
const httpsAgent = new https.Agent(agentOptions);

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

const IPV4_COMPATIBLE = ipaddr.IPv6.parseCIDR('::/96');
const NAT64_WELL_KNOWN = ipaddr.IPv6.parseCIDR('64:ff9b::/96');

/**
 * Build an IPv4 address from two 16-bit IPv6 groups.
 *
 * @param {number} hi
 * @param {number} lo
 * @returns {ipaddr.IPv4}
 */
function ipv4FromGroups(hi, lo) {
  return new ipaddr.IPv4([(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff]);
}

/**
 * Default-deny: anything outside ipaddr.js's plain "unicast" range is private.
 * IPv6 transition prefixes that route to an embedded IPv4 address are classified
 * by that IPv4 address instead, so e.g. DNS64-synthesized addresses for public
 * hosts are still allowed on NAT64 networks.
 *
 * @param {ipaddr.IPv4 | ipaddr.IPv6} address
 * @returns {boolean}
 */
function isPrivateAddress(address) {
  if (address instanceof ipaddr.IPv6) {
    const parts = address.parts;

    // ::/96 - unspecified, loopback and deprecated IPv4-compatible addresses (RFC 4291).
    // ipaddr.js classifies IPv4-compatible addresses such as ::7f00:1 as unicast.
    if (address.match(IPV4_COMPATIBLE)) {
      return true;
    }

    switch (address.range()) {
      // ::ffff:0:0/96 IPv4-mapped (RFC 4291) and ::ffff:0:0:0/96 IPv4-translated (RFC 6145)
      case 'ipv4Mapped':
      case 'rfc6145':
        return isPrivateAddress(ipv4FromGroups(parts[6], parts[7]));
      // 64:ff9b::/96 NAT64 well-known prefix (RFC 6052). The 64:ff9b:1::/48 local-use
      // prefix (RFC 8215) has a network-specific IPv4 position, so it stays blocked.
      case 'rfc6052':
        if (address.match(NAT64_WELL_KNOWN)) {
          return isPrivateAddress(ipv4FromGroups(parts[6], parts[7]));
        }
        return true;
      // 2002::/16 6to4 (RFC 3056)
      case '6to4':
        return isPrivateAddress(ipv4FromGroups(parts[1], parts[2]));
    }
  }

  return address.range() !== 'unicast';
}

function isPrivateIp(addr) {
  // Fail closed: treat missing/empty values as private
  if (!addr) {
    return true;
  }

  let address;
  try {
    // WHATWG normalization first so every IPv4 form Node will connect to
    // (decimal, octal, hex, integer, shortened) is parsed the same way
    address = ipaddr.parse(normalizeIPv4(addr) ?? addr);
  } catch {
    // Unrecognized format - fail closed
    return true;
  }

  return isPrivateAddress(address);
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
    return Promise.reject(
      new errors.InternalServerError({
        message: 'URL resolves to a non-permitted private IP block',
        code: 'URL_PRIVATE_INVALID',
        context: options.url.href,
      }),
    );
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
      context: options.url.href,
    });
  }
}

async function disableRetries(options) {
  // Force disable retries
  options.retry = {
    limit: 0,
    calculateDelay: () => 0,
  };
  options.timeout = {
    request: 5000,
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
  options.dnsLookup = (hostname, dnsOpts, callback) => {
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
            return callback(
              new errors.InternalServerError({
                message: 'URL resolves to a non-permitted private IP block',
                code: 'URL_PRIVATE_INVALID',
                context: requestHref,
              }),
            );
          }
        }
        return callback(null, results);
      }
      if (isPrivateIp(/** @type {string} */ (addressOrResult))) {
        return callback(
          new errors.InternalServerError({
            message: 'URL resolves to a non-permitted private IP block',
            code: 'URL_PRIVATE_INVALID',
            context: requestHref,
          }),
        );
      }
      callback(null, addressOrResult, family);
    });
  };
}

// fetch requires these statuses to be constructed with a null body
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * Wraps a Got instance in a fetch-compatible function so libraries that take a
 * custom fetcher still go through the instance's hooks, agents, and timeouts
 *
 * @param {Got} client
 * @returns {(input: string | URL, init?: RequestInit) => Promise<Response>}
 */
function createFetch(client) {
  return async function fetch(input, init = {}) {
    let body;
    if (typeof init.body === 'string') {
      body = init.body;
    } else if (init.body instanceof Uint8Array) {
      body = Buffer.from(init.body);
    } else if (init.body !== undefined && init.body !== null) {
      throw new errors.IncorrectUsageError({
        message: 'externalRequest.fetch only supports string or Uint8Array bodies',
      });
    }

    const redirect = init.redirect ?? 'follow';

    const response = await client(input, {
      method: /** @type {import('got').Method} */ (init.method ?? 'GET'),
      headers: Object.fromEntries(new Headers(init.headers)),
      body,
      signal: init.signal ?? undefined,
      followRedirect: redirect === 'follow',
      throwHttpErrors: false,
      responseType: 'buffer',
    });

    if (redirect === 'error' && response.statusCode >= 300 && response.statusCode < 400) {
      throw new errors.InternalServerError({
        message: 'Unexpected redirect',
        context: response.url,
      });
    }

    const res = new Response(NULL_BODY_STATUSES.has(response.statusCode) ? null : response.body, {
      status: response.statusCode,
      statusText: response.statusMessage,
      // raw pairs keep repeated headers (e.g. set-cookie) that response.headers comma-joins
      headers: _.chunk(response.rawHeaders, 2),
    });
    Object.defineProperty(res, 'url', { value: response.url });

    return res;
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
    'user-agent': 'Ghost(https://github.com/TryGhost/Ghost)',
  },
  timeout: {
    request: 10000,
  }, // default is no timeout
  agent: {
    http: httpAgent,
    https: httpsAgent,
  },
  hooks: {
    init: process.env.NODE_ENV?.startsWith('test') ? [disableRetries] : [],
    beforeRequest: [errorIfInvalidUrl, errorIfHostnameResolvesToPrivateIp, installSafeDnsLookup],
    beforeRedirect: [errorIfHostnameResolvesToPrivateIp, installSafeDnsLookup],
  },
};

const externalRequest = got.extend(gotOpts);
externalRequest.isPrivateIp = isPrivateIp;
externalRequest._installSafeDnsLookup = installSafeDnsLookup;
externalRequest.fetch = createFetch(externalRequest);
module.exports = externalRequest;
