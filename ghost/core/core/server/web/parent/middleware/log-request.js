const logging = require('@tryghost/logging');
const promClient = require('prom-client');

const counter = new promClient.Counter({
    name: 'ghost_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'statusCode']
});

const summary = new promClient.Summary({
    name: 'ghost_http_response_time',
    help: 'Summary of response times for all HTTP requests',
    percentiles: [0.01, 0.1, 0.9, 0.99]
});

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
            logging.error({req: req, res: res, err: req.err});
        } else {
            logging.info({req: req, res: res});
        }

        counter.inc({
            method: req.method,
            statusCode: res.statusCode
        });

        summary.observe(Date.now() - startTime);

        res.removeListener('finish', logResponse);
        res.removeListener('close', logResponse);
    }

    res.on('finish', logResponse);
    res.on('close', logResponse);
    next();
};
