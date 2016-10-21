var logging = require('../logging');

/**
 * @TODO:
 * - add unique id to request
 * - move middleware to ignition?
 */
module.exports = function logRequest(req, res, next) {
    var startTime = Date.now();

    function logResponse() {
        res.responseTime = (Date.now() - startTime) + 'ms';

        if (req.err) {
            logging.error({req: req, res: res, err: req.err});
        } else {
            logging.info({req: req, res: res});
        }
    }

    res.once('finish', logResponse);
    res.once('close', logResponse);
    next();
};
