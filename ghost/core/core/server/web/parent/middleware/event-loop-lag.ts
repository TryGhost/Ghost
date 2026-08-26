import { monitorEventLoopDelay } from 'node:perf_hooks';
import path from 'node:path';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';
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
 * Config reaches us through nconf, which layers JSON files over argv and env
 * vars - so a value that is a number in config.production.json arrives as a
 * string when it is set via GHOST_optimization__eventLoopLag__... Comparing
 * those directly is silently wrong rather than loudly broken: '60' >= '250'
 * is true, so an env-var-configured site would fail validation for no reason.
 */
function toFiniteNumber(value: unknown, name: string): number {
  const parsed = typeof value === 'string' ? Number(value) : value;

  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) {
    throw new errors.IncorrectUsageError({
      message: `eventLoopLag ${name} must be a finite number, got ${JSON.stringify(value)}`,
    });
  }

  return parsed;
}

/**
 * Plain prefixes rather than a regular expression: nconf can only ever hand us
 * JSON, so a RegExp is unreachable from config, and compiling one supplied by
 * an operator would put an unbounded backtracking risk on the hot path of the
 * middleware whose whole job is to protect the CPU. startsWith is also cheaper
 * per request, and matches how max-limit-cap.js exempts endpoints.
 */
function toPathPrefixes(value: unknown): string[] {
  if (value === undefined) {
    return DEFAULTS.exemptPathPrefixes;
  }

  const prefixes = typeof value === 'string' ? [value] : value;

  if (!Array.isArray(prefixes) || prefixes.some((prefix) => typeof prefix !== 'string')) {
    throw new errors.IncorrectUsageError({
      message: `eventLoopLag exemptPathPrefixes must be a string or an array of strings, got ${JSON.stringify(value)}`,
    });
  }

  return prefixes;
}

export type EventLoopLagConfig = Readonly<{
  /** Lag at or above which the origin starts shedding, in ms. */
  highWaterMarkMs: number;
  /** Lag at or below which it resumes serving, in ms. Must be below the high mark. */
  lowWaterMarkMs: number;
  /** How often the histogram is summarised and reset, in ms. */
  sampleWindowMs?: number;
  /** Which percentile of the window is compared against the water marks. */
  percentile?: number;
  /** libuv sampling resolution, in ms. */
  resolutionMs?: number;
  /** Retry-After sent on shed responses, in seconds. */
  retryAfterSeconds?: number;
  /** Path prefixes that are never shed. Replaces the default, it does not merge. */
  exemptPathPrefixes?: string[] | string;
}>;

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
  const windowMs = toFiniteNumber(
    config.sampleWindowMs ?? DEFAULTS.sampleWindowMs,
    'sampleWindowMs',
  );
  const percentile = toFiniteNumber(config.percentile ?? DEFAULTS.percentile, 'percentile');
  const resolution = toFiniteNumber(config.resolutionMs ?? DEFAULTS.resolutionMs, 'resolutionMs');
  const highWaterMarkMs = toFiniteNumber(config.highWaterMarkMs, 'highWaterMarkMs');
  const lowWaterMarkMs = toFiniteNumber(config.lowWaterMarkMs, 'lowWaterMarkMs');

  if (lowWaterMarkMs >= highWaterMarkMs) {
    throw new errors.IncorrectUsageError({
      message: `eventLoopLag lowWaterMarkMs (${lowWaterMarkMs}) must be below highWaterMarkMs (${highWaterMarkMs})`,
    });
  }

  // An idle loop reports a delay of roughly one sampling interval, not zero -
  // the histogram measures how late each sample was, and a sample is never
  // early. A low water mark under the resolution can therefore never be
  // reached, and the origin would shed until it was restarted.
  if (lowWaterMarkMs <= resolution) {
    throw new errors.IncorrectUsageError({
      message: `eventLoopLag lowWaterMarkMs (${lowWaterMarkMs}) must exceed resolutionMs (${resolution}); an idle event loop reports ~${resolution}ms of delay`,
    });
  }

  const histogram = monitorEventLoopDelay({ resolution });
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
export function eventLoopLag(
  config: EventLoopLagConfig,
  monitor: LagMonitor = createLagMonitor(config),
): RequestHandler {
  const retryAfter = String(
    toFiniteNumber(config.retryAfterSeconds ?? DEFAULTS.retryAfterSeconds, 'retryAfterSeconds'),
  );
  const exemptPathPrefixes = toPathPrefixes(config.exemptPathPrefixes);

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
    if (!monitor.isOverloaded() || !isSheddable(req)) {
      return next();
    }

    res.setHeader('Retry-After', retryAfter);
    // Never let a shed response be cached. Without this the CDN can pin a 503
    // over a perfectly good URL for the whole TTL, long outliving the spike.
    res.setHeader('Cache-Control', 'no-store, private');
    res.status(503);
    monitor.recordShed();

    // Deliberately not routed through the error handler: rendering an error
    // page costs the loop time we are shedding to reclaim. The 503 is recorded
    // in the access log by the logRequest middleware either way, so there is
    // no per-request logging here - at the rate this fires, that would itself
    // be meaningful load.
    return res.end();
  };
}
