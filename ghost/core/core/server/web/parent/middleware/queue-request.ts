import path from 'node:path';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

interface QueueConfig {
  concurrencyLimit?: number;
}

interface QueuedRequest {
  req: Request;
  res: Response;
  next: NextFunction;
  queuedAt: number;
  cancel: () => void;
}

const debug = (message: string) => {
  logging.debug(`[queue-request] ${message}`);
};

/**
 * Limits how many dynamic requests are processed at once, holding the rest in
 * a FIFO queue.
 *
 * A slot is released when the response is ended or the connection closes,
 * whichever happens first, so a handler that never ends its response cannot
 * hold a slot forever. Work abandoned by a disconnected client may keep running
 * after its slot has been handed on.
 */
export function queueRequest(config: QueueConfig): RequestHandler {
  if (config.concurrencyLimit === undefined) {
    throw new errors.IncorrectUsageError({
      message: 'concurrencyLimit must be defined when using queueRequest middleware',
    });
  }

  const concurrencyLimit = config.concurrencyLimit;
  if (!Number.isInteger(concurrencyLimit) || concurrencyLimit <= 0) {
    throw new errors.IncorrectUsageError({
      message: 'concurrencyLimit must be a positive integer',
    });
  }

  // Set iterates in insertion order and deletes in O(1), so cancelling a deep queue stays cheap
  const queue = new Set<QueuedRequest>();
  let activeCount = 0;
  let drainScheduled = false;

  function start({ req, res, next, queuedAt }: QueuedRequest) {
    activeCount += 1;
    req.extra = { ...req.extra, queueWaitMs: Date.now() - queuedAt };

    let released = false;
    const release = () => {
      if (released) {
        return;
      }
      released = true;
      activeCount -= 1;
      debug(`Request completed: ${req.path}`);
      scheduleStartNext();
    };

    const end = res.end;
    res.end = function (this: Response, ...args: Parameters<Response['end']>) {
      res.end = end;
      release();
      return end.apply(this, args);
    } as Response['end'];
    res.once('close', release);

    next();
  }

  // Deferred and bounded so handlers that respond synchronously neither grow the
  // stack per queued request nor drain a deep backlog without yielding to I/O
  function scheduleStartNext() {
    if (drainScheduled) {
      return;
    }
    drainScheduled = true;
    setImmediate(() => {
      drainScheduled = false;
      startNext();
    });
  }

  function startNext() {
    const availableSlots = concurrencyLimit - activeCount;
    for (let started = 0; started < availableSlots && queue.size > 0; started += 1) {
      const [entry] = queue;
      queue.delete(entry);
      entry.res.removeListener('close', entry.cancel);
      start(entry);
    }
  }

  return function queueRequestMw(req: Request, res: Response, next: NextFunction) {
    req.queueDepth = queue.size;

    // Do not queue requests for static assets - We assume that any path
    // with a file extension is a static asset
    if (path.extname(req.path)) {
      debug(`Request for assumed static asset skipping queue: ${req.path}`);
      return next();
    }

    const entry: QueuedRequest = {
      req,
      res,
      next,
      queuedAt: Date.now(),
      cancel: () => {
        queue.delete(entry);
        debug(`Request cancelled while queued: ${req.path}`);
      },
    };

    // an empty-queue check keeps arrivals behind requests awaiting a deferred start
    if (activeCount < concurrencyLimit && queue.size === 0) {
      return start(entry);
    }

    debug(`Request queued: ${req.path}`);
    queue.add(entry);
    res.once('close', entry.cancel);
  };
}
