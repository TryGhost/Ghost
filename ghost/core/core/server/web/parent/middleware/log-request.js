const logging = require('@tryghost/logging');
const config = require('../../../../shared/config');

/**
 * @TODO: move this middleware to Framework monorepo?
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function logRequest(req, res, next) {
    const startTime = Date.now();

    function logResponse() {
        res.responseTime = (Date.now() - startTime) + 'ms';
        req.userId = req.user ? (req.user.id ? req.user.id : req.user) : null;

        if (req.err && req.err.statusCode !== 404) {
            // 4xx are client errors (validation, auth, rate limit), not server
            // faults. Production keeps them at error (they're monitored); the test
            // env sets logging:logClientErrorsAsError=false to demote them to warn,
            // where every deliberate error-response assertion (expectStatus(4xx))
            // would otherwise log a redundant line.
            const isClientError = req.err.statusCode >= 400 && req.err.statusCode < 500;
            if (isClientError && config.get('logging:logClientErrorsAsError') === false) {
                logging.warn({req: req, res: res, err: req.err});
            } else {
                logging.error({req: req, res: res, err: req.err});
            }
        } else {
            logging.info({req: req, res: res});
        }

        res.removeListener('finish', logResponse);
        res.removeListener('close', logResponse);
    }

    res.on('finish', logResponse);
    res.on('close', logResponse);
    next();
};
