const crypto = require('crypto');
const session = require('cookie-session');
const settingsCache = require('../settings-cache');

const privateSession = session({
    name: 'ghost-private',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    signed: false,
    sameSite: 'none'
});

function getAccessCode() {
    const accessCode = settingsCache.get('password');
    return typeof accessCode === 'string' ? accessCode : '';
}

function hasAccessCode(accessCode) {
    return typeof accessCode === 'string' && accessCode.trim().length > 0;
}

function hashAccessCode(accessCode, salt) {
    const hasher = crypto.createHash('sha256');
    hasher.update(accessCode + salt, 'utf8');
    return hasher.digest('hex');
}

function hasAccess(req) {
    const accessCode = getAccessCode();
    const salt = req.session?.salt || '';
    const hash = req.session?.token || '';

    if (!salt || !hash || !hasAccessCode(accessCode)) {
        return false;
    }

    return hashAccessCode(accessCode, salt) === hash;
}

function grantAccess(req, submittedAccessCode) {
    const accessCode = getAccessCode();

    if (!hasAccessCode(accessCode) || !hasAccessCode(submittedAccessCode) || accessCode !== submittedAccessCode) {
        return false;
    }

    const salt = Date.now().toString();
    req.session.token = hashAccessCode(submittedAccessCode, salt);
    req.session.salt = salt;
    return true;
}

function loadSession(req, res, next) {
    const isPrivateBlog = settingsCache.get('is_private');

    if (!isPrivateBlog) {
        res.isPrivateBlog = false;
        return next();
    }

    res.isPrivateBlog = true;
    return privateSession(req, res, next);
}

module.exports = {
    grantAccess,
    hasAccess,
    loadSession
};
