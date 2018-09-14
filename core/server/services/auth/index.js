var passport = require('./passport'),
    auth = require('./auth'),
    authorize = require('./authorize'),
    authenticate = require('./authenticate'),
    session = require('./session'),
    oauth = require('./oauth');

/* TODO: Remove when v0.1 is dropped */
exports.init = function (options) {
    oauth.init(options);
    return passport.init(options);
};

/* TODO: Remove when v0.1 is dropped */
exports.oauth = oauth;

exports.auth = auth;
exports.authorize = authorize;
exports.authenticate = authenticate;
exports.session = session;
