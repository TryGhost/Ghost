const debug = require('@tryghost/debug')('middleware:queue-request');
const metrics = require('@tryghost/metrics');
const path = require('node:path');
const expressQueue = require('express-queue');

const CONCURRENCY_LIMIT = 100;

module.exports = function queueRequest(
    config,
    queueFactory = expressQueue,
    logMetric = metrics.metric.bind(metrics)
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

        logMetric('request-queue', {
            event: 'request-queued',
            queueLength: job.queue.getLength()
            // @todo: What else do we want to log here?
        });
    });

    // @todo: This seems to fire even when a request is not queued
    queue.queue.on('complete', (job) => {
        debug(`Request completed: ${job.data.req.path}`);

        logMetric('request-queue', {
            event: 'request-completed',
            queueLength: job.queue.getLength()
            // @todo: What else do we want to log here?
        });
    });

    return (req, res, next) => {
        const ext = path.extname(req.path);
        const staticAssetExts = ['.css', '.js', '.map', '.woff2', '.ico']; // @todo: extend this list to include other static asset types

        // Do not queue requests for static assets
        if (staticAssetExts.some(staticAssetExt => ext.startsWith(staticAssetExt))) {
            debug(`Request for static asset skipping queue: ${req.path}`);

            return next();
        }

        return queue(req, res, next);
    };
};

module.exports.CONCURRENCY_LIMIT = CONCURRENCY_LIMIT;
