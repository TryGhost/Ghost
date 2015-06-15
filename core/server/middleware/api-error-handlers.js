var errors = require('../errors');

module.exports.methodNotAllowed = function methodNotAllowed(req, res, next) {
    next(new errors.MethodNotAllowedError('Unknown method: ' + req.path));
};

module.exports.errorHandler = function errorHandler(err, req, res, next) {
    /*jshint unused:false */
    var httpErrors = errors.formatHttpErrors(err);
    errors.logError(err);
    // Send a properly formatted HTTP response containing the errors
    res.status(httpErrors.statusCode).json({errors: httpErrors.errors});
};
