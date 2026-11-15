const crypto = require('crypto');
const session = require('cookie-session');
const settingsCache = require('../settings-cache');

const privateSession = session({
  name: 'ghost-private',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  signed: false,
  sameSite: 'none',
});

function getAccessCode() {
  const accessCode = settingsCache.get('password');
  return typeof accessCode === 'string' ? accessCode : '';
}

function hasAccessCode(accessCode) {
  return typeof accessCode === 'string' && accessCode.trim().length > 0;
}

function getSessionSecret() {
  const secret = settingsCache.get('theme_session_secret');
  return typeof secret === 'string' ? secret : '';
}

// The ghost-private cookie is unsigned, so the token must depend on a server-held
// secret. Otherwise anyone could compute a valid token for a guessed access code
// and use every gated request as an unthrottled guessing oracle.
function hashAccessCode(accessCode, salt, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`ghost-private:${accessCode}:${salt}`, 'utf8');
  return hmac.digest('hex');
}

function hasAccess(req) {
  const accessCode = getAccessCode();
  const salt = req.session?.salt || '';
  const hash = req.session?.token || '';
  const secret = getSessionSecret();

  if (
    typeof salt !== 'string' ||
    typeof hash !== 'string' ||
    !salt ||
    !hash ||
    !secret ||
    !hasAccessCode(accessCode)
  ) {
    return false;
  }

  const expected = Buffer.from(hashAccessCode(accessCode, salt, secret));
  const actual = Buffer.from(hash);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function grantAccess(req, submittedAccessCode) {
  const accessCode = getAccessCode();
  const secret = getSessionSecret();

  if (
    !secret ||
    !hasAccessCode(accessCode) ||
    !hasAccessCode(submittedAccessCode) ||
    accessCode !== submittedAccessCode
  ) {
    return false;
  }

  const salt = Date.now().toString();
  req.session.token = hashAccessCode(submittedAccessCode, salt, secret);
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
  loadSession,
};
