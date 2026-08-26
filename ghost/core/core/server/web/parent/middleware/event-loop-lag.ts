import { monitorEventLoopDelay } from 'node:perf_hooks';
import path from 'node:path';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { Request, RequestHandler } from 'express';

const NS_PER_MS = 1e6;

const DEFAULTS = {
  sampleWindowMs: 500,
  percentile: 90,
  resolutionMs: 20,
  retryAfterSeconds: 5,
  // The admin client and its API. Locking the owner out of their own site
  // during an incident is worse than serving readers a little slower.
  exemptPathPrefixes: ['/ghost/'],
};

/**
 * Resolving Ghost's config into the values this middleware runs on.
 *
 * Config arrives untyped: nconf layers an operator's config file, environment
 * variables and argv over defaults.json, so any value can be anything - and a
 * number set through an environment variable arrives as a string.
 *
 * A numeric string is accepted for that reason. z.coerce.number() is not used
 * because it also accepts null, true, [] and '' - all of which become 0, which
 * here would silently mean "shed everything".
 */
const Milliseconds = z
  .union([z.number(), z.string().trim().min(1)])
  .transform(Number)
  .pipe(z.number().positive().finite());

const Percentile = z
  .union([z.number(), z.string().trim().min(1)])
  .transform(Number)
  .pipe(z.number().gt(0).lte(100));

/**
 * Path prefixes rather than a regular expression: nconf can only ever hand us
 * JSON, so a RegExp is unreachable from config, and compiling one supplied by
 * an operator would put an unbounded backtracking risk on the hot path of the
 * middleware whose whole job is to protect the CPU. startsWith is also cheaper
 * per request, and matches how max-limit-cap.js exempts endpoints.
 *
 * A bare string is accepted because an environment variable can only supply one.
 */
const PathPrefixes = z.union([
  z
    .string()
    .min(1)
    .transform((prefix) => [prefix]),
  z.array(z.string().min(1)),
]);

/**
 * The water marks are required and deliberately have no shipped fallback: a
 * site that opts into shedding must say where its thresholds are, and inventing
 * them silently could shed everything. The tuning values below do fall back to
 * the shipped default rather than throwing, because an operator can correct a
 * typo live and one must not take the site down.
 */
const EventLoopLagConfigSchema = z
  .object({
    highWaterMarkMs: Milliseconds,
    lowWaterMarkMs: Milliseconds,
    sampleWindowMs: Milliseconds.catch(DEFAULTS.sampleWindowMs),
    percentile: Percentile.catch(DEFAULTS.percentile),
    resolutionMs: Milliseconds.catch(DEFAULTS.resolutionMs),
    retryAfterSeconds: Milliseconds.catch(DEFAULTS.retryAfterSeconds),
    exemptPathPrefixes: PathPrefixes.catch(DEFAULTS.exemptPathPrefixes),
  })
  .superRefine((config, ctx) => {
    // One threshold oscillates: shedding lowers lag, which re-admits the
    // traffic that raised it. The gap between the marks is the hysteresis.
    if (config.lowWaterMarkMs >= config.highWaterMarkMs) {
      ctx.addIssue({
        code: 'custom',
        message: `lowWaterMarkMs (${config.lowWaterMarkMs}) must be below highWaterMarkMs (${config.highWaterMarkMs})`,
      });
    }

    // An idle loop reports a delay of roughly one sampling interval, not zero -
    // the histogram measures how late each sample was, and a sample is never
    // early. A low water mark under the resolution can therefore never be
    // reached, and the origin would shed until it was restarted.
    if (config.lowWaterMarkMs <= config.resolutionMs) {
      ctx.addIssue({
        code: 'custom',
        message: `lowWaterMarkMs (${config.lowWaterMarkMs}) must exceed resolutionMs (${config.resolutionMs}); an idle event loop reports ~${config.resolutionMs}ms of delay`,
      });
    }
  });

/** The config this middleware actually runs on, once resolved. */
export type EventLoopLagConfig = z.infer<typeof EventLoopLagConfigSchema>;

/**
 * Parses whatever config supplied into the values the middleware runs on,
 * reporting a bad one as a Ghost error so it fails at boot rather than on the
 * first request.
 */
export function parseEventLoopLagConfig(configured: unknown): EventLoopLagConfig {
  const result = EventLoopLagConfigSchema.safeParse(configured);

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
 * Tracks event loop delay as a rolling window and flips between a healthy and
 * an overloaded state with hysteresis.
 *
 * monitorEventLoopDelay is sampled by libuv itself rather than by a JS timer,
 * so it stays accurate exactly when a JS timer would not: while the loop is
 * blocked. The histogram it returns is cumulative, though, so it has to be
 * reset each window - read without resetting, a site that was briefly busy an
 * hour ago never looks healthy again.
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

    // Two water marks rather than one: a single threshold oscillates, because
    // shedding lowers lag, which immediately re-admits the traffic that raised
    // it. Flapping every window would make the CDN cache a mix of real pages
    // and 503s.
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
      // CASE: the sampler is a timer, so a fully blocked loop stops it running
      // and leaves `overloaded` stale at whatever it was before the block. If
      // it has missed its window by a wide margin, the loop is by definition
      // too congested to be serving - treat that as overloaded regardless.
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
 * serve them within any timeout the CDN in front of it is willing to wait for.
 *
 * This has to sit ahead of the request queue: shedding a request that has
 * already waited in the queue has paid the cost it was meant to avoid.
 */
export function eventLoopLag(configured: unknown, monitor?: LagMonitor): RequestHandler {
  const config = parseEventLoopLagConfig(configured);
  const lagMonitor = monitor ?? createLagMonitor(config);
  const retryAfter = String(config.retryAfterSeconds);
  const { exemptPathPrefixes } = config;

  const isSheddable = (req: Request) => {
    // Only idempotent reads. A shed GET costs the client a retry; a shed POST
    // could drop a member signup, a comment, or a Stripe webhook.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return false;
    }

    // Static assets are served off disk without touching the renderer, so they
    // are not what is burning the loop - and shedding them breaks the pages
    // that did get rendered.
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
    // Never let a shed response be cached. Without this the CDN can pin a 503
    // over a perfectly good URL for the whole TTL, long outliving the spike.
    res.setHeader('Cache-Control', 'no-store, private');
    res.status(503);
    lagMonitor.recordShed();

    // Deliberately not routed through the error handler: rendering an error
    // page costs the loop time we are shedding to reclaim. The 503 is recorded
    // in the access log by the logRequest middleware either way, so there is
    // no per-request logging here - at the rate this fires, that would itself
    // be meaningful load.
    return res.end();
  };
}
