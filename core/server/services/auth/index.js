var passport = require('./passport'),
    authorize = require('./authorize'),
    authenticate = require('./authenticate'),
    session = require('./session'),
    oauth = require('./oauth');

exports.init = function (options) {
    oauth.init(options);
    return passport.init(options);
};

exports.oauth = oauth;
exports.authorize = authorize;
exports.authenticate = authenticate;
exports.session = session;
