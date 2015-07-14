var errors = require('../errors');

module.exports.errorHandler = function errorHandler(err, req, res, next) {
    /*jshint unused:false */
    var httpErrors = errors.formatHttpErrors(err);
    errors.logError(err);
    // Send a properly formatted HTTP response containing the errors
    res.status(httpErrors.statusCode).json({errors: httpErrors.errors});
};
