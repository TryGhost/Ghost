function handleError(next) {
    return function handleError(err) {
        // If we've thrown an error message of type: 'NotFound' then we found no path match.
        if (err.errorType === 'NotFoundError') {
            return next();
        }

        return next(err);
    };
}

module.exports = handleError;
