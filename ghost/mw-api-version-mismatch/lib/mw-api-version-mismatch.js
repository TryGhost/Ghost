const versionMismatchHandler = (APIVersionCompatibilityService) => {
    return async (err, req, res, next) => {
        if (err && err.errorType === 'RequestNotAcceptableError') {
            if (err.code === 'UPDATE_CLIENT') {
                await APIVersionCompatibilityService.handleMismatch({
                    acceptVersion: req.headers['accept-version'],
                    contentVersion: `v${res.locals.safeVersion}`,
                    requestURL: req.originalUrl,
                    userAgent: req.headers['user-agent']
                });
            }
        }

        next(err, req, res);
    };
};

module.exports = versionMismatchHandler;
