const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const path = require('node:path');
const expressQueue = require('express-queue');
const promClient = require('prom-client');

const debug = (message) => {
    logging.debug(`[queue-request] ${message}`);
};

module.exports = function queueRequest(
    config,
    queueFactory = expressQueue
) {
    if (config.concurrencyLimit === undefined) {
        throw new errors.IncorrectUsageError({
            message: 'concurrencyLimit must be defined when using queueRequest middleware'
        });
    }

    debug(`Initialising queueRequest middleware with config: ${JSON.stringify(config)}`);

    // @see https://github.com/alykoshin/express-queue#usage
    const queue = queueFactory({
        activeLimit: config.concurrencyLimit,
        queuedLimit: -1 // Do not limit the number of queued requests
    });

    const queueGauge = new promClient.Gauge({
        name: 'ghost_request_queue_depth',
        help: 'Number of HTTP requests queued',
        collect() {
            this.set(queue.queue.getLength());
        }
    });

    const activeRequestGauge = new promClient.Gauge({
        name: 'ghost_request_queue_in_process',
        help: 'Number of HTTP requests in process'
    });

    /**
     * Available events:
     * - queue - when a request is queued
     * - dequeue - when a request is dequeued
     * - process - when a request is being processed
     * - reject - when a request is rejected
     * - cancel - when a request is cancelled
     * - complete - when a request has completed
     *
     * @see https://github.com/search?q=repo:alykoshin/mini-queue%20job._toState&type=code
     */
    queue.queue.on('queue', (job) => {
        debug(`Request queued: ${job.data.req.path}`);
    });

    queue.queue.on('process', (job) => {
        activeRequestGauge.inc();
    });

    queue.queue.on('complete', (job) => {
        debug(`Request completed: ${job.data.req.path}`);
        activeRequestGauge.dec();
    });

    queue.queue.on('reject', (job) => {
        activeRequestGauge.dec();
    });

    queue.queue.on('cancel', (job) => {
        activeRequestGauge.dec();
    });

    /**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     * @param {import('express').NextFunction} next
     */
    return function queueRequestMw(req, res, next) {
        req.queueDepth = queue.queue.getLength();

        // Do not queue requests for static assets - We assume that any path
        // with a file extension is a static asset
        if (path.extname(req.path)) {
            debug(`Request for assumed static asset skipping queue: ${req.path}`);

            return next();
        }

        return queue(req, res, next);
    };
};
