var uuid = require('uuid'),
    logging = require('../../lib/common/logging');

/**
 * @TODO:
 * - move middleware to ignition?
 */
module.exports = function logRequest(req, res, next) {
    var startTime = Date.now(),
        requestId = req.get('X-Request-ID') || uuid.v1();

    function logResponse() {
        res.responseTime = (Date.now() - startTime) + 'ms';
        req.requestId = requestId;
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
