const passport = require('./passport');
const authorize = require('./authorize');
const authenticate = require('./authenticate');
const session = require('./session');
const oauth = require('./oauth');

exports.authorize = authorize;
exports.authenticate = authenticate;
exports.session = session;

/**
  * @TODO: Remove when v0.1 is dropped
  *
*/
exports.init = function (options) {
    oauth.init(options);
    return passport.init(options);
};
exports.oauth = oauth;
