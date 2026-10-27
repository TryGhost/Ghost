import { z } from 'zod';
import type { GhostLogger } from '@tryghost/logging';
import type { GhostMetrics } from '@tryghost/metrics';
import type { Tracer } from './tracer';

type Exit = { outcome: 'success' } | { outcome: 'failure'; err: unknown };

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

/** Spells a span's name the way Ghost's other metrics are named, such as `mailgun-send-mail`. */
const metricOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
    labels: Record<string, string>,
    start: { timestamp: number; at: number },
    exit: Exit,
  ): void {
    const metric = metricOf(name);
    const failed = (err: unknown) =>
      logging.error(
        { event: { name: 'metrics.record.failed' }, err, metric },
        'Recording a span failed',
      );
    try {
      const document = {
        '@timestamp': start.timestamp,
        event: {
          name,
          outcome: exit.outcome,
          // Elastic Common Schema measures `event.duration` in nanoseconds.
          duration: Math.round((performance.now() - start.at) * 1e6),
        },
        ...(exit.outcome === 'failure' ? { error: { type: errorTypeOf(exit.err) } } : {}),
        labels,
      };
      // Deferred and never awaited, so neither the transport's own work nor a slow response
      // holds up the operation.
      Promise.resolve()
        .then(() => transport.metric(metric, document))
        .catch(failed);
    } catch (err) {
      failed(err);
    }
  }

  return {
    async track(name, fn) {
      const start = { timestamp: Date.now(), at: performance.now() };
      const labels: Record<string, string> = {};
      const span = {
        setAttribute(key: string, value: string) {
          // Elasticsearch reads a dot in a field name as nesting, and labels can't nest. Elastic's
          // APM replaces dots the same way.
          labels[key.replace(/\./g, '_')] = value;
        },
      };
      try {
        const result = await fn(span);
        record(name, labels, start, { outcome: 'success' });
        return result;
      } catch (err) {
        record(name, labels, start, { outcome: 'failure', err });
        throw err;
      }
    },
  };
}
