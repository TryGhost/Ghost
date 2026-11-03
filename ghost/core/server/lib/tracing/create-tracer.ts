import { randomBytes } from 'node:crypto';
import { InternalServerError } from '@tryghost/errors';
import { z } from 'zod';
import type { GhostLogger } from '@tryghost/logging';
import type { GhostMetrics } from '@tryghost/metrics';
import { noLabels, setLabel, type Labels } from './labels';
import type { Span, Tracer } from './tracer';

type Exit = { outcome: 'success' } | { outcome: 'failure'; err: unknown };

/**
 * The ids OpenTelemetry calls a span context. A failed span's exception log line carries the same
 * ids as the span, so the line can be found from the span and the span from the line.
 */
interface SpanContext {
  trace: { id: string };
  span: { id: string };
}

/**
 * The document each span ships as. Its fields follow the Elastic Common Schema, which is also how
 * Elastic's APM stores OpenTelemetry spans. The span's name goes in `event.name`, the field Ghost's
 * log lines name their events in.
 */
export interface SpanDocument extends SpanContext, Labels {
  '@timestamp': number;
  event: { name: string; outcome: Exit['outcome']; duration: number };
  error?: { type: string };
}

/**
 * Every span ships to the same data stream, `metrics-ghost-spans`, whatever the span's name, so a
 * new span needs no setting up in Elasticsearch and lands beside every other span. Dashboards
 * tell spans apart by `event.name`.
 */
const METRIC = 'ghost-spans';

const CodedError = z.object({ code: z.string().min(1) });

/**
 * The type a failed span records for its error. An error's code, such as Stripe's
 * `email_invalid`, says more than the error's class, so the code comes first when there is one.
 */
function errorTypeOf(err: unknown): string {
  const coded = CodedError.safeParse(err);
  if (coded.success) {
    return coded.data.code;
  }
  if (err instanceof Error) {
    // Stripe's error classes, such as StripeInvalidRequestError, don't set `name`, so every Stripe
    // error is named `Error` and only its class tells it apart.
    return err.name === 'Error' ? err.constructor.name : err.name;
  }
  // OpenTelemetry's conventions give `error.type` this value when the error's type is unknown,
  // such as when an operation throws a string.
  return '_OTHER';
}

/**
 * Ghost's logger only fills a line's message and error fields from an `Error`. When an operation
 * throws something else, such as a string, the thrown value is wrapped in an InternalServerError
 * whose message is the thrown value, so the log line still says what was thrown.
 */
function loggable(err: unknown): Error {
  return err instanceof Error ? err : new InternalServerError({ message: String(err) });
}

/**
 * Creates a tracer that ships each span through `transport` as a `SpanDocument`, and logs the
 * exception of each failed span through `logging` as a line named `<span name>.exception`.
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
        // Copied, because the document ships after `track` has returned, and an attribute set on
        // the span after the span ended mustn't change the document.
        labels: { ...attributes.labels },
        numeric_labels: { ...attributes.numeric_labels },
      };
      // Shipped on a later tick and never awaited, so neither the transport's own work nor a slow
      // response from Elasticsearch delays the traced operation's result.
      Promise.resolve()
        .then(() => transport.metric(METRIC, document))
        .catch(failed);
    } catch (err) {
      failed(err);
    }
  }

  /**
   * Logs the exception of a failed span as a line of its own, carrying the span's ids and
   * attributes, so the line can be matched to the span.
   */
  function logException(
    name: string,
    context: SpanContext,
    attributes: Labels,
    err: unknown,
  ): void {
    // No message is passed, so Ghost's logger uses the error's message as the line's message.
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
      // Ids in OpenTelemetry's formats. Each span starts a new trace, because this tracer doesn't
      // link a span to another span it runs inside.
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
