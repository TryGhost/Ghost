const debug = require('@tryghost/debug')('middleware:queue-request');
const path = require('node:path');
const expressQueue = require('express-queue');

const CONCURRENCY_LIMIT = 100; // @todo: Placeholder value until we have a better idea of what this should be

module.exports = function queueRequest(
    config,
    queueFactory = expressQueue
) {
    config = {
        ...{
            concurrencyLimit: CONCURRENCY_LIMIT
        },
        ...config
    };

    debug('Initialising middleware with config:', config);

    // @see https://github.com/alykoshin/express-queue#usage
    const queue = queueFactory({
        activeLimit: config.concurrencyLimit,
        queuedLimit: -1 // Do not limit the number of queued requests
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

    queue.queue.on('complete', (job) => {
        debug(`Request completed: ${job.data.req.path}`);

        job.data.req.queueDepth = job.queue.getLength();
    });

    return (req, res, next) => {
        // Do not queue requests for static assets - We assume that any path
        // with a file extension is a static asset
        if (path.extname(req.path)) {
            debug(`Request for assumed static asset skipping queue: ${req.path}`);

            return next();
        }

        return queue(req, res, next);
    };
};

module.exports.CONCURRENCY_LIMIT = CONCURRENCY_LIMIT;
