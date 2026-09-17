const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const path = require('node:path');
const expressQueue = require('express-queue');
const prometheusClient = require('../../../../shared/prometheus-client');

const SHED_METRIC_NAME = 'request_queue_shed_total';

/**
 * Why a request was shed, used as a metric label
 */
const SHED_REASON = {
  // The queue was already at `maxQueueDepth` when the request arrived
  DEPTH: 'depth',
  // The request sat in the queue for longer than `maxQueueTime`
  TIMEOUT: 'timeout',
};

/**
 * How long we suggest clients wait before retrying a shed request. Kept short
 * because shedding is a response to a transient spike, not an outage.
 */
const RETRY_AFTER_SECONDS = 5;

const debug = (message) => {
  logging.debug(`[queue-request] ${message}`);
};

/**
 * @param {object} config
 * @param {number} config.concurrencyLimit - Number of requests processed at once
 * @param {number} [config.maxQueueDepth] - Maximum number of queued requests before new requests are shed. Defaults to unlimited
 * @param {number} [config.maxQueueTime] - Maximum time in ms a request may wait in the queue before it is shed. Defaults to disabled
 * @param {Function} [queueFactory]
 * @param {object} [metrics]
 * @returns {import('express').RequestHandler}
 */
module.exports = function queueRequest(
  config,
  queueFactory = expressQueue,
  metrics = prometheusClient,
) {
  if (config.concurrencyLimit === undefined) {
    throw new errors.IncorrectUsageError({
      message: 'concurrencyLimit must be defined when using queueRequest middleware',
    });
  }

  // -1 is express-queue's "no limit". A limit of 0 would reject every request,
  // including ones the queue could start immediately, so it is not allowed.
  const maxQueueDepth = config.maxQueueDepth === undefined ? -1 : config.maxQueueDepth;

  if (maxQueueDepth !== -1 && !(Number.isInteger(maxQueueDepth) && maxQueueDepth > 0)) {
    throw new errors.IncorrectUsageError({
      message: 'maxQueueDepth must be a positive integer when using queueRequest middleware',
    });
  }

  const maxQueueTime = config.maxQueueTime === undefined ? 0 : config.maxQueueTime;

  if (!(Number.isInteger(maxQueueTime) && maxQueueTime >= 0)) {
    throw new errors.IncorrectUsageError({
      message: 'maxQueueTime must be a positive integer when using queueRequest middleware',
    });
  }

  debug(`Initialising queueRequest middleware with config: ${JSON.stringify(config)}`);

  // Ghost can boot more than once in a single process, and registering the
  // same metric twice throws
  if (metrics && !metrics.getMetric(SHED_METRIC_NAME)) {
    metrics.registerCounter({
      name: SHED_METRIC_NAME,
      help: 'Number of requests shed by the request queue without being served',
      labelNames: ['reason'],
    });
  }

  /**
   * Give up on a request instead of serving it.
   *
   * This deliberately does as little work as possible - no theme rendering, no
   * error page - because the entire point of shedding is to stop spending the
   * resources that are keeping the queue from draining.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {string} reason - One of SHED_REASON
   */
  const shedRequest = (req, res, reason) => {
    metrics?.getMetric(SHED_METRIC_NAME)?.inc({ reason });

    debug(`Request shed (${reason}): ${req.path}`);

    // The client may already have gone away, in which case there is nothing
    // left to respond to
    if (res.headersSent || res.writableEnded) {
      return;
    }

    res.set({
      'Cache-Control': 'no-store',
      'Retry-After': String(RETRY_AFTER_SECONDS),
    });

    res.status(503).send('Service Unavailable');
  };

  // @see https://github.com/alykoshin/express-queue#usage
  const queue = queueFactory({
    activeLimit: config.concurrencyLimit,
    queuedLimit: maxQueueDepth,
    rejectHandler: (req, res) => shedRequest(req, res, SHED_REASON.DEPTH),
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

    const { req, res } = job.data;

    if (!req.queueDeadline) {
      return;
    }

    // Shed the request as soon as it passes its deadline, rather than waiting
    // for it to reach the front of the queue. By this point whatever is in
    // front of Ghost has given up on the request, so holding the connection
    // open only adds to the backlog we are trying to clear.
    const timer = setTimeout(
      () => {
        // This is how express-queue itself removes a queued job when a client
        // disconnects, and is the only way to take a request out of the queue
        // without leaking the concurrency slot it would later occupy
        queue.queue._cancelJob(job);

        shedRequest(req, res, SHED_REASON.TIMEOUT);
      },
      Math.max(0, req.queueDeadline - Date.now()),
    );

    // Covers both a request reaching the front of the queue and a request
    // being cancelled, because cancelling dequeues first
    job.once('dequeue', () => clearTimeout(timer));
  });

  queue.queue.on('complete', (job) => {
    debug(`Request completed: ${job.data.req.path}`);
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

    if (!maxQueueTime) {
      return queue(req, res, next);
    }

    req.queueDeadline = Date.now() + maxQueueTime;

    // A request can still reach the front of the queue after its deadline, for
    // example if the event loop was too busy to run the timer above on time.
    // Checking again here means we never hand a stale request to the app.
    return queue(req, res, (...args) => {
      if (Date.now() >= req.queueDeadline) {
        return shedRequest(req, res, SHED_REASON.TIMEOUT);
      }

      return next(...args);
    });
  };
};

module.exports.SHED_METRIC_NAME = SHED_METRIC_NAME;
module.exports.SHED_REASON = SHED_REASON;
