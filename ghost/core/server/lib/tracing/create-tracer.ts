import { z } from 'zod';
import type { GhostLogger } from '@tryghost/logging';
import type { GhostMetrics } from '@tryghost/metrics';
import type { AttributeValue, Span, Tracer } from './tracer';

type Exit = { outcome: 'success' } | { outcome: 'failure'; err: unknown };

/** What each span ships as, in the Elastic Common Schema fields Elastic's APM stores spans in. */
export interface SpanDocument {
  '@timestamp': number;
  event: { name: string; outcome: Exit['outcome']; duration: number };
  error?: { type: string };
  // Elastic's APM keeps numbers apart from the other attributes, so they can be summed,
  // averaged and bucketed.
  labels: Record<string, string | boolean | string[] | boolean[]>;
  numeric_labels: Record<string, number | number[]>;
}

/**
 * Every span ships to the one data stream, `metrics-ghost-spans`, whatever its name, so a new
 * span is found beside the rest with nothing to set up, and dashboards tell spans apart by
 * `event.name`.
 */
const METRIC = 'ghost-spans';

/** A list holds one kind of value, so its first says which; an empty list is never asked. */
const isNumeric = (value: AttributeValue): value is number | number[] =>
  typeof value === 'number' || (Array.isArray(value) && typeof value[0] === 'number');

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
 * Ships each span as a `@tryghost/metrics` document in Elastic Common Schema fields, which
 * Elastic's APM also stores OpenTelemetry spans in. `event.name` holds the span's name, as it
 * holds the event's name in Ghost's logs.
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
    attributes: Pick<SpanDocument, 'labels' | 'numeric_labels'>,
    start: { timestamp: number; at: number },
    exit: Exit,
  ): void {
    const failed = (err: unknown) =>
      logging.error(
        { event: { name: 'metrics.record.failed' }, err, span: name },
        'Recording a span failed',
      );
    try {
      const document: SpanDocument = {
        '@timestamp': start.timestamp,
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

  return {
    async track(name, fn) {
      const start = { timestamp: Date.now(), at: performance.now() };
      const attributes: Pick<SpanDocument, 'labels' | 'numeric_labels'> = {
        labels: {},
        numeric_labels: {},
      };
      const span: Span = {
        setAttribute(key, value) {
          // Elasticsearch reads a dot in a field name as nesting, and labels can't nest. Elastic's
          // APM replaces dots the same way.
          const field = key.replace(/\./g, '_');
          // A key set again can change kind, so its old value is cleared from both.
          delete attributes.labels[field];
          delete attributes.numeric_labels[field];
          // Elasticsearch stores nothing for an empty list, and its kind can't be told.
          if (Array.isArray(value) && value.length === 0) {
            return;
          }
          // Copied, as OpenTelemetry copies a list, so changing it afterwards can't change what
          // the span ships.
          const copy = structuredClone(value);
          if (isNumeric(copy)) {
            attributes.numeric_labels[field] = copy;
          } else {
            attributes.labels[field] = copy;
          }
        },
      };
      try {
        const result = await fn(span);
        record(name, attributes, start, { outcome: 'success' });
        return result;
      } catch (err) {
        record(name, attributes, start, { outcome: 'failure', err });
        throw err;
      }
    },
  };
}
