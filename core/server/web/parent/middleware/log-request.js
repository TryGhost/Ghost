const logging = require('../../../../shared/logging');

/**
 * @TODO: move this middleware to ignition?
 */
module.exports = function logRequest(req, res, next) {
    const startTime = Date.now();

    function logResponse() {
        res.responseTime = (Date.now() - startTime) + 'ms';
        req.userId = req.user ? (req.user.id ? req.user.id : req.user) : null;

        if (req.err && req.err.statusCode !== 404) {
            logging.error({req: req, res: res, err: req.err});
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
