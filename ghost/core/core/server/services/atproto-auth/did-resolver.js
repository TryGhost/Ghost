/**
 * ATProto DID and handle resolution.
 *
 * Resolution order for handles:
 *   1. DNS TXT record: _atproto.<handle>  →  "did=did:..."
 *   2. HTTPS fallback: GET https://<handle>/.well-known/atproto-did
 *
 * DID document fetching:
 *   did:web  →  GET https://<domain>/.well-known/did.json
 *   did:plc  →  GET <plcDirectory>/<did>
 */
const dns = require('node:dns/promises');
const logging = require('@tryghost/logging');
const {BadRequestError, InternalServerError} = require('@tryghost/errors');

// Matches a valid ATProto handle: dot-separated labels of [a-zA-Z0-9-]
const HANDLE_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
// Matches did:plc or did:web
const DID_RE = /^did:(plc|web):[a-zA-Z0-9._:%-]+$/;

/**
 * @param {string} url
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<string>} response body text
 */
async function fetchText(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {Accept: 'application/json, text/plain, */*'},
            redirect: 'follow'
        });
        if (!res.ok) {
            throw new InternalServerError({message: `HTTP ${res.status} from ${url}`});
        }
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

/**
 * @param {string} url
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<Object>}
 */
async function fetchJson(url, timeoutMs = 5000) {
    const text = await fetchText(url, timeoutMs);
    return JSON.parse(text);
}

/**
 * Validate and normalise a handle string.
 * @param {string} handle
 * @returns {string} lower-cased handle
 * @throws if the handle is invalid
 */
function validateHandle(handle) {
    if (typeof handle !== 'string' || handle.length === 0) {
        throw new BadRequestError({message: 'Handle is required'});
    }
    // Strip leading @ if present
    const cleaned = handle.startsWith('@') ? handle.slice(1) : handle;
    if (!HANDLE_RE.test(cleaned)) {
        throw new BadRequestError({message: 'Invalid ATProto handle format'});
    }
    if (cleaned.length > 253) {
        throw new BadRequestError({message: 'Handle too long'});
    }
    return cleaned.toLowerCase();
}

/**
 * Resolve a handle to a DID.
 * @param {string} handle  already-validated handle
 * @returns {Promise<string>} DID
 */
async function resolveHandleToDid(handle) {
    // 1. DNS TXT
    try {
        const records = await dns.resolveTxt(`_atproto.${handle}`);
        for (const parts of records) {
            const value = parts.join('');
            if (value.startsWith('did=')) {
                const did = value.slice(4).trim();
                if (DID_RE.test(did)) {
                    return did;
                }
            }
        }
    } catch (err) {
        logging.error(`[atproto-auth] DNS TXT lookup failed for ${handle}:`, err);
    }

    // 2. HTTPS fallback
    try {
        const did = (await fetchText(`https://${handle}/.well-known/atproto-did`)).trim();
        if (DID_RE.test(did)) {
            return did;
        }
    } catch (err) {
        logging.error(`[atproto-auth] HTTPS DID lookup failed for ${handle}:`, err);
    }

    // 3. Bluesky PDS fallback (for .bluesky.social handles)
    if (handle.endsWith('.bluesky.social')) {
        try {
            const result = await fetchJson(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`);
            if (result.did && DID_RE.test(result.did)) {
                return result.did;
            }
        } catch (err) {
            logging.error(`[atproto-auth] Bluesky PDS lookup failed for ${handle}:`, err);
        }
    }

    throw new BadRequestError({message: `Handle not found or does not exist: ${handle}`});
}

/**
 * Fetch and return the DID document for a DID.
 * @param {string} did
 * @param {string} plcDirectory  e.g. "https://plc.directory"
 * @returns {Promise<Object>}
 */
async function fetchDidDocument(did, plcDirectory) {
    let url;
    if (did.startsWith('did:web:')) {
        const rest = did.slice('did:web:'.length);
        // Colons in did:web encode path segments
        const [host, ...pathParts] = rest.split(':');
        const path = pathParts.length ? `/${pathParts.join('/')}` : '';
        url = `https://${host}${path}/.well-known/did.json`;
    } else if (did.startsWith('did:plc:')) {
        url = `${plcDirectory}/${did}`;
    } else {
        throw new BadRequestError({message: `Unsupported DID method: ${did}`});
    }

    const doc = await fetchJson(url);
    if (doc.id !== did) {
        throw new InternalServerError({message: 'DID document id mismatch'});
    }
    return doc;
}

/**
 * Extract the ATProto PDS URL from a DID document.
 * @param {Object} didDoc
 * @returns {string} PDS service endpoint URL
 */
function extractPdsUrl(didDoc) {
    const services = didDoc.service || [];
    const pds = services.find(s =>
        s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer'
    );
    if (!pds || !pds.serviceEndpoint) {
        throw new InternalServerError({message: 'DID document has no AtprotoPersonalDataServer service'});
    }
    return pds.serviceEndpoint;
}

/**
 * Fetch the OAuth authorization server metadata for a PDS URL.
 *
 * ATProto separates the PDS (resource server) from the AS (authorization server).
 * For Bluesky-hosted accounts the PDS delegates to bsky.social as its AS.  We
 * follow RFC 9728 / the ATProto spec:
 *
 *   1. Fetch {pds}/.well-known/oauth-protected-resource to discover the AS.
 *   2. Fetch {as}/.well-known/oauth-authorization-server for the PAR/token endpoints.
 *
 * If the PDS does not expose an oauth-protected-resource document (self-hosted PDS
 * that is its own AS) we fall back to fetching the AS metadata directly from the
 * PDS URL.
 *
 * @param {string} pdsUrl
 * @returns {Promise<Object>}
 */
async function fetchAuthServerMeta(pdsUrl) {
    const base = pdsUrl.replace(/\/$/, '');

    // Step 1: discover the authorization server via the protected-resource doc.
    let asUrl = base;
    try {
        const resource = await fetchJson(`${base}/.well-known/oauth-protected-resource`);
        if (Array.isArray(resource.authorization_servers) && resource.authorization_servers.length > 0) {
            asUrl = resource.authorization_servers[0].replace(/\/$/, '');
        }
    } catch {
        // PDS is its own AS (e.g. self-hosted); fall back to the PDS URL.
    }

    // Step 2: fetch the authorization server metadata.
    const meta = await fetchJson(`${asUrl}/.well-known/oauth-authorization-server`);

    const required = ['issuer', 'pushed_authorization_request_endpoint', 'authorization_endpoint', 'token_endpoint'];
    for (const field of required) {
        if (!meta[field]) {
            throw new InternalServerError({message: `Authorization server metadata missing field: ${field}`});
        }
    }
    return meta;
}

module.exports = {
    validateHandle,
    resolveHandleToDid,
    fetchDidDocument,
    extractPdsUrl,
    fetchAuthServerMeta,
    DID_RE
};
