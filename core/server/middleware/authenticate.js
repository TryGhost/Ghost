var passport         = require('passport'),
    apiErrorHandlers = require('./api-error-handlers');

// ### Authenticate Middleware
// authentication has to be done for /ghost/* routes with
// exceptions for signin, signout, signup, forgotten, reset only
// api and frontend use different authentication mechanisms atm
function authenticate(req, res, next) {
    var path,
        subPath;

    // SubPath is the url path starting after any default subdirectories
    // it is stripped of anything after the two levels `/ghost/.*?/` as the reset link has an argument
    path = req.path;
    /*jslint regexp:true, unparam:true*/
    subPath = path.replace(/^(\/.*?\/.*?\/)(.*)?/, function replace(match, a) {
        return a;
    });

    if (subPath.indexOf('/ghost/api/') === 0
        && (path.indexOf('/ghost/api/v0.1/authentication/') !== 0
        || (path.indexOf('/ghost/api/v0.1/authentication/setup/') === 0 && req.method === 'PUT'))) {
        return passport.authenticate('bearer', {session: false, failWithError: true},
            function authenticate(err, user, info) {
                if (err) {
                    return next(err); // will generate a 500 error
                }
                // Generate a JSON response reflecting authentication status
                if (!user) {
                    var error = {
                        code: 401,
                        errorType: 'NoPermissionError',
                        message: 'Please Sign In'
                    };

                    return apiErrorHandlers.errorHandler(error, req, res, next);
                }
                // TODO: figure out, why user & authInfo is lost
                req.authInfo = info;
                req.user = user;
                return next(null, user, info);
            }
        )(req, res, next);
    }
    next();
}

module.exports = authenticate;
