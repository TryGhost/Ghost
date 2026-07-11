const crypto = require('crypto');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');

const COOKIE_NAME = 'ghost-admin-toolbar';
// Public URL contract used by Ghost Admin's "view site" iframe and by the toolbar hide action.
const QUERY_PARAM = 'admin';
const HIDE_QUERY_PARAM = 'admin_toolbar';
const COOKIE_MAX_AGE = 60 * 60;
const TOKEN_TTL_MS = COOKIE_MAX_AGE * 1000;

function getSecret() {
    return settingsCache.get('admin_session_secret') || settingsCache.get('theme_session_secret');
}

function sign(expiry, nonce, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(`${expiry}:${nonce}`)
        .digest('hex');
}

function createToken(now = Date.now()) {
    const secret = getSecret();

    if (!secret) {
        return null;
    }

    const expiry = now + TOKEN_TTL_MS;
    const nonce = crypto.randomBytes(16).toString('hex');
    const signature = sign(expiry, nonce, secret);

    return `${expiry}:${nonce}:${signature}`;
}

function hasValidToken(token, now = Date.now()) {
    if (!token) {
        return false;
    }

    const secret = getSecret();

    if (!secret) {
        return false;
    }

    const parts = token.split(':');

    if (parts.length !== 3) {
        return false;
    }

    const [expiry, nonce, signature] = parts;
    const expiryTimestamp = Number.parseInt(expiry, 10);

    if (!Number.isFinite(expiryTimestamp) || expiryTimestamp <= now) {
        return false;
    }

    const expectedSignature = sign(expiryTimestamp, nonce, secret);
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function getCookieValue(req) {
    const header = req.headers?.cookie;

    if (!header) {
        return null;
    }

    const cookies = header.split(';');

    for (const item of cookies) {
        const index = item.indexOf('=');

        if (index === -1) {
            continue;
        }

        const name = item.slice(0, index).trim();

        if (name !== COOKIE_NAME) {
            continue;
        }

        try {
            return decodeURIComponent(item.slice(index + 1).trim());
        } catch {
            return item.slice(index + 1).trim();
        }
    }

    return null;
}

function getCookieOptions() {
    return {
        httpOnly: true,
        maxAge: COOKIE_MAX_AGE,
        path: urlUtils.getSubdir() || '/',
        sameSite: 'lax',
        secure: urlUtils.isSSL(urlUtils.getSiteUrl())
    };
}

function appendMarkerCookie(res, value, maxAge = COOKIE_MAX_AGE) {
    const existing = res.getHeader('Set-Cookie');
    const options = getCookieOptions();
    const nextCookie = [
        `${COOKIE_NAME}=${encodeURIComponent(value)}`,
        `Max-Age=${maxAge}`,
        `Path=${options.path}`,
        'HttpOnly',
        `SameSite=${options.sameSite === 'lax' ? 'Lax' : options.sameSite}`
    ].concat(options.secure ? ['Secure'] : []).join('; ');
    const cookies = Array.isArray(existing) ? existing : existing ? [existing] : [];

    res.setHeader('Set-Cookie', cookies.concat(nextCookie));
}

function appendClearCookie(res) {
    appendMarkerCookie(res, '', 0);
}

function getCleanRedirectUrl(req) {
    const currentUrl = new URL(req.originalUrl || req.url, urlUtils.getSiteUrl());
    currentUrl.searchParams.delete(QUERY_PARAM);
    currentUrl.searchParams.delete(HIDE_QUERY_PARAM);

    return `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
}

function getQueryValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function isToolbarSuppressed(req) {
    const hideQueryValue = getQueryValue(req.query?.[HIDE_QUERY_PARAM]);
    const fetchDestination = req.headers?.['sec-fetch-dest'];

    return hideQueryValue === '0' || String(fetchDestination || '').toLowerCase() === 'iframe';
}

function adminToolbarMiddleware(req, res, next) {
    const toolbarSuppressed = isToolbarSuppressed(req);

    if (Object.prototype.hasOwnProperty.call(req.query || {}, QUERY_PARAM)) {
        const value = getQueryValue(req.query[QUERY_PARAM]);

        if (value === '0') {
            appendClearCookie(res);
        } else if (value === '1') {
            const token = createToken();

            if (token) {
                appendMarkerCookie(res, token);
            }
        }

        res.setHeader('Cache-Control', 'no-store');
        // frontend-caching preserves this response header so marker cookie changes are not cached.
        res.locals.staffFrontendToolsCookieUpdated = true;

        if (toolbarSuppressed && value === '1') {
            res.locals.staffFrontendToolsEnabled = false;
            return next();
        }

        return res.redirect(302, getCleanRedirectUrl(req));
    }

    res.locals.staffFrontendToolsEnabled = toolbarSuppressed ? false : hasValidToken(getCookieValue(req));

    return next();
}

module.exports = adminToolbarMiddleware;
module.exports._private = {
    COOKIE_NAME,
    HIDE_QUERY_PARAM,
    QUERY_PARAM,
    createToken,
    hasValidToken,
    getCleanRedirectUrl,
    getCookieValue,
    isToolbarSuppressed
};
