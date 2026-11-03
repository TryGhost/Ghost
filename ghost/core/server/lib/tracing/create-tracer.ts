import { randomBytes } from 'node:crypto';
import { InternalServerError } from '@tryghost/errors';
import { z } from 'zod';
import type { GhostLogger } from '@tryghost/logging';
import type { GhostMetrics } from '@tryghost/metrics';
import { noLabels, setLabel, type Labels } from './labels';
import type { Span, Tracer } from './tracer';

type Exit = { outcome: 'success' } | { outcome: 'failure'; err: unknown };

/** OpenTelemetry's span context, which the span's exception line also carries. */
interface SpanContext {
  trace: { id: string };
  span: { id: string };
}

/** What each span ships as, in the Elastic Common Schema fields Elastic's APM stores spans in. */
export interface SpanDocument extends SpanContext, Labels {
  '@timestamp': number;
  event: { name: string; outcome: Exit['outcome']; duration: number };
  error?: { type: string };
}

/**
 * Every span ships to the one data stream, `metrics-ghost-spans`, whatever its name, so a new
 * span is found beside the rest with nothing to set up, and dashboards tell spans apart by
 * `event.name`.
 */
const METRIC = 'ghost-spans';

const CodedError = z.object({ code: z.string().min(1) });

function errorTypeOf(err: unknown): string {
  const coded = CodedError.safeParse(err);
  if (coded.success) {
    return coded.data.code;
  }
  if (err instanceof Error) {
    // Stripe's errors all keep the name `Error`, so only their class tells them apart.
    return err.name === 'Error' ? err.constructor.name : err.name;
  }
  // OpenTelemetry's `error.type` for an error of no known type.
  return '_OTHER';
}

/**
 * Ghost's logger takes the line's message and error fields from an `Error`, so anything else
 * thrown is logged as one, with what was thrown as its message.
 */
function loggable(err: unknown): Error {
  return err instanceof Error ? err : new InternalServerError({ message: String(err) });
}

/**
 * Ships each span as a `@tryghost/metrics` document in Elastic Common Schema fields, which
 * Elastic's APM also stores OpenTelemetry spans in. `event.name` holds the span's name, as it
 * holds the event's name in Ghost's logs. A failure's exception is logged as `<name>.exception`.
 */
export function createTracer({
  transport,
  logging,
}: {
  transport: Pick<GhostMetrics, 'metric'>;
  logging: Pick<GhostLogger, 'error'>;
}): Tracer {
  function record(
    name: string,
    context: SpanContext,
    attributes: Labels,
    start: { timestamp: number; at: number },
    exit: Exit,
  ): void {
    const failed = (err: unknown) =>
      logging.error(
        {
          event: { name: 'metrics.record.failed' },
          err,
          trace: context.trace,
          span: { ...context.span, name },
        },
        'Recording a span failed',
      );
    try {
      const document: SpanDocument = {
        '@timestamp': start.timestamp,
        ...context,
        event: {
          name,
          outcome: exit.outcome,
          // Elastic Common Schema measures `event.duration` in nanoseconds.
          duration: Math.round((performance.now() - start.at) * 1e6),
        },
        ...(exit.outcome === 'failure' ? { error: { type: errorTypeOf(exit.err) } } : {}),
        // Copied, so an attribute set after the span has ended can't change what it ships.
        labels: { ...attributes.labels },
        numeric_labels: { ...attributes.numeric_labels },
      };
      // Deferred and never awaited, so neither the transport's own work nor a slow response
      // holds up the operation.
      Promise.resolve()
        .then(() => transport.metric(METRIC, document))
        .catch(failed);
    } catch (err) {
      failed(err);
    }
  }

  /** Logs a failure's exception beside its span, with the span's ids and attributes. */
  function logException(
    name: string,
    context: SpanContext,
    attributes: Labels,
    err: unknown,
  ): void {
    // With no message of its own, Ghost's logger makes the error's message the line.
    logging.error({
      event: { name: `${name}.exception` },
      err: loggable(err),
      ...context,
      error: { type: errorTypeOf(err) },
      labels: attributes.labels,
      numeric_labels: attributes.numeric_labels,
    });
  }

  return {
    async track(name, fn) {
      const start = { timestamp: Date.now(), at: performance.now() };
      // In OpenTelemetry's formats. Each span is a trace of its own, as spans aren't linked to
      // the span they run inside.
      const context: SpanContext = {
        trace: { id: randomBytes(16).toString('hex') },
        span: { id: randomBytes(8).toString('hex') },
      };
      const attributes = noLabels();
      const span: Span = {
        setAttribute(key, value) {
          setLabel(attributes, key, value);
        },
      };
      try {
        const result = await fn(span);
        record(name, context, attributes, start, { outcome: 'success' });
        return result;
      } catch (err) {
        record(name, context, attributes, start, { outcome: 'failure', err });
        logException(name, context, attributes, err);
        throw err;
      }
    },
  };
}
