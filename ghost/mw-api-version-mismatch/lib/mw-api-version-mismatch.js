const extractApiKey = require('./extract-api-key');

const versionMismatchHandler = (APIVersionCompatibilityService) => {
    /**
     * @param {Object} err
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    return async function versionMismatchHandlerMiddleware(err, req, res, next) {
        if (err && err.errorType === 'RequestNotAcceptableError') {
            if (err.code === 'UPDATE_CLIENT') {
                const {key, type} = extractApiKey(req);
                const requestURL = req.originalUrl.split('?').shift();

                await APIVersionCompatibilityService.handleMismatch({
                    acceptVersion: req.headers['accept-version'],
                    contentVersion: `v${res.locals.safeVersion}`,
                    requestURL,
                    userAgent: req.headers['user-agent'],
                    apiKeyValue: key,
                    apiKeyType: type
                });
            }
        }

        next(err);
    };
};

module.exports = versionMismatchHandler;
