// # DisableAdmin Middleware
// Usage: disableAdmin(request, result, next)
// After: decideIsAdmin
// Before:
// App: Blog
//
// Disables the Admin if the user config explicitly says to.

var config = require('../config'),
    errors = require('../errors'),

    disableAdmin;

disableAdmin = function disableAdmin(req, res, next) {
    if (res.isAdmin && config.disableAdmin === true) {
        return errors.error404(req, res, next);
    }

    next();
};

module.exports = disableAdmin;
