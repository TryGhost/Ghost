import { monitorEventLoopDelay } from 'node:perf_hooks';
import path from 'node:path';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { Request, RequestHandler } from 'express';

const NS_PER_MS = 1e6;

// Config is untyped, and a value set through an environment variable or argv
// arrives as a string. Not z.coerce.number(): it also accepts null, true, []
// and '', turning each into 0 - which for a water mark means "shed everything".
const Numeric = z.union([z.number(), z.string().trim().min(1)]).transform(Number);
const Milliseconds = Numeric.pipe(z.number().positive().finite());
const Percentile = Numeric.pipe(z.number().gt(0).lte(100));
const Flag = z.union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')]);

// Prefixes rather than a RegExp: nconf can only produce JSON, and an
// operator-supplied regex would put backtracking risk on the hot path of the
// middleware whose job is to protect the CPU. A bare string is accepted
// because an environment variable can only ever supply one.
const PathPrefixes = z.union([
  z
    .string()
    .min(1)
    .transform((prefix) => [prefix]),
  z.array(z.string().min(1)),
]);

const fields = {
  enabled: Flag,
  highWaterMarkMs: Milliseconds,
  lowWaterMarkMs: Milliseconds,
  sampleWindowMs: Milliseconds,
  percentile: Percentile,
  resolutionMs: Milliseconds,
  retryAfterSeconds: Milliseconds,
  exemptPathPrefixes: PathPrefixes,
};

// defaults.json is the single source of the shipped values - it is the lowest
// config layer and the file an operator actually edits, so it is read rather
// than restated. Parsed eagerly and strictly: a bad value there is our bug and
// should fail at boot, not become the fallback for everything below.
const shipped = z
  .object(fields)
  .parse(require('../../../../shared/config/defaults.json').optimization.eventLoopLag);

const EventLoopLagConfigSchema = z
  .object({
    enabled: fields.enabled.catch(shipped.enabled),
    // Each field falls back to the shipped value on its own, so one typo does
    // not take the site down.
    highWaterMarkMs: fields.highWaterMarkMs.catch(shipped.highWaterMarkMs),
    lowWaterMarkMs: fields.lowWaterMarkMs.catch(shipped.lowWaterMarkMs),
    sampleWindowMs: fields.sampleWindowMs.catch(shipped.sampleWindowMs),
    percentile: fields.percentile.catch(shipped.percentile),
    resolutionMs: fields.resolutionMs.catch(shipped.resolutionMs),
    retryAfterSeconds: fields.retryAfterSeconds.catch(shipped.retryAfterSeconds),
    exemptPathPrefixes: fields.exemptPathPrefixes.catch(shipped.exemptPathPrefixes),
  })
  // Individually valid values can still be incoherent together. These throw
  // rather than falling back, because there is no way to guess which of the two
  // the operator meant.
  .superRefine((config, ctx) => {
    // The gap between the marks is the hysteresis. A single threshold
    // oscillates: shedding lowers lag, which re-admits the traffic that raised
    // it, and the CDN caches a mix of real pages and 503s.
    if (config.lowWaterMarkMs >= config.highWaterMarkMs) {
      ctx.addIssue({
        code: 'custom',
        message: `lowWaterMarkMs (${config.lowWaterMarkMs}) must be below highWaterMarkMs (${config.highWaterMarkMs})`,
      });
    }

    // An idle loop reports roughly one sampling interval of delay, not zero, so
    // a mark under the resolution can never be reached and the origin would
    // shed until it was restarted.
    if (config.lowWaterMarkMs <= config.resolutionMs) {
      ctx.addIssue({
        code: 'custom',
        message: `lowWaterMarkMs (${config.lowWaterMarkMs}) must exceed resolutionMs (${config.resolutionMs}); an idle event loop reports ~${config.resolutionMs}ms of delay`,
      });
    }
  });

export type EventLoopLagConfig = z.infer<typeof EventLoopLagConfigSchema>;

/** Resolves configured values, failing at boot rather than on the first request. */
export function parseEventLoopLagConfig(configured: unknown): EventLoopLagConfig {
  const result = EventLoopLagConfigSchema.safeParse(configured ?? {});

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => [issue.path.join('.'), issue.message].filter(Boolean).join(' '))
      .join('; ');

    throw new errors.IncorrectUsageError({
      message: `Invalid optimization.eventLoopLag config: ${detail}`,
    });
  }

  return result.data;
}

export type LagMonitor = Readonly<{
  isOverloaded: () => boolean;
  lagMs: () => number;
  recordShed: () => void;
  stop: () => void;
}>;

/**
 * Tracks event loop delay as a rolling window, flipping between healthy and
 * overloaded with hysteresis.
 *
 * monitorEventLoopDelay is sampled by libuv rather than by a JS timer, so it
 * stays accurate exactly when a timer would not: while the loop is blocked. Its
 * histogram is cumulative, so it has to be reset each window - read without
 * resetting, a site that was briefly busy an hour ago never reads healthy again.
 */
export function createLagMonitor(config: EventLoopLagConfig): LagMonitor {
  const { highWaterMarkMs, lowWaterMarkMs, sampleWindowMs: windowMs, percentile } = config;

  const histogram = monitorEventLoopDelay({ resolution: config.resolutionMs });
  histogram.enable();

  let lagMs = 0;
  let overloaded = false;
  let shedSinceTransition = 0;
  let lastSampleAt = Date.now();

  const sample = () => {
    lagMs = histogram.count === 0 ? 0 : histogram.percentile(percentile) / NS_PER_MS;
    histogram.reset();
    lastSampleAt = Date.now();

    if (!overloaded && lagMs >= highWaterMarkMs) {
      overloaded = true;
      shedSinceTransition = 0;
      logging.warn(
        `[event-loop-lag] Shedding: p${percentile} lag ${Math.round(lagMs)}ms >= ${highWaterMarkMs}ms`,
      );
    } else if (overloaded && lagMs <= lowWaterMarkMs) {
      overloaded = false;
      logging.info(
        `[event-loop-lag] Recovered: p${percentile} lag ${Math.round(lagMs)}ms <= ${lowWaterMarkMs}ms after shedding ${shedSinceTransition} requests`,
      );
    }
  };

  const timer = setInterval(sample, windowMs);
  // Don't hold the process open on shutdown.
  timer.unref();

  return {
    isOverloaded: () => {
      // The sampler is itself a timer, so a fully blocked loop stops it running
      // and leaves the flag stale. A badly overdue sample means the loop is too
      // congested to be serving anyway.
      if (Date.now() - lastSampleAt > windowMs * 4) {
        return true;
      }

      return overloaded;
    },
    lagMs: () => lagMs,
    recordShed: () => {
      shedSinceTransition += 1;
    },
    stop: () => {
      clearInterval(timer);
      histogram.disable();
    },
  };
}

/**
 * Sheds idempotent frontend reads while the event loop is too far behind to
 * serve them within the timeout of whatever is in front of it.
 *
 * Belongs ahead of the request queue: shedding a request that has already
 * waited in the queue has paid the cost shedding exists to avoid.
 */
export function eventLoopLag(configured: unknown, monitor?: LagMonitor): RequestHandler {
  const config = parseEventLoopLagConfig(configured);
  const lagMonitor = monitor ?? createLagMonitor(config);
  const retryAfter = String(config.retryAfterSeconds);
  const { exemptPathPrefixes } = config;

  const isSheddable = (req: Request) => {
    // A shed GET costs the client a retry; a shed POST could drop a member
    // signup, a comment, or a Stripe webhook.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return false;
    }

    // Static assets don't touch the renderer, and shedding them breaks the
    // pages that did get rendered.
    if (path.extname(req.path)) {
      return false;
    }

    return !exemptPathPrefixes.some((prefix) => req.path.startsWith(prefix));
  };

  return function eventLoopLagMw(req, res, next) {
    if (!lagMonitor.isOverloaded() || !isSheddable(req)) {
      return next();
    }

    res.setHeader('Retry-After', retryAfter);
    // Never let a shed response be cached, or the CDN can pin a 503 over a good
    // URL for the whole TTL, long outliving the spike.
    res.setHeader('Cache-Control', 'no-store, private');
    res.status(503);
    lagMonitor.recordShed();

    // Not routed through the error handler: rendering an error page costs the
    // loop time we are shedding to reclaim. logRequest still records the 503,
    // so there is no per-request logging here - at the rate this fires that
    // would itself be real load.
    return res.end();
  };
}
