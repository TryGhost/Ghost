import { z } from 'zod';
import type { GhostLogger } from '@tryghost/logging';
import type { GhostMetrics } from '@tryghost/metrics';
import type { Attempt, Metrics, TagShape, Tags, TrackDefinition } from './track';

/** How an attempt ended. */
type Exit = { outcome: 'success' } | { outcome: 'failure'; err: unknown };

/** An error code: Stripe's (`email_invalid`), Node's (`ECONNRESET`) or one of Ghost's. */
const CodedError = z.object({ code: z.string().min(1) });
const GhostError = z.object({ errorType: z.string().min(1) });

/**
 * Why an attempt failed, as a small set of values rather than its message: the error's code,
 * else Ghost's error type, else its name or class, else `_OTHER` for a throw that isn't an error.
 */
function errorTypeOf(err: unknown): string {
  const coded = CodedError.safeParse(err);
  if (coded.success) {
    return coded.data.code;
  }
  const ghost = GhostError.safeParse(err);
  if (ghost.success) {
    return ghost.data.errorType;
  }
  if (err instanceof Error) {
    // Stripe's errors leave their name as `Error` and say what they are with their class.
    return err.name === 'Error' ? err.constructor.name : err.name;
  }
  return '_OTHER';
}

/**
 * Records each tracked attempt as one `@tryghost/metrics` document, which its transports ship
 * to the `metrics-<metric>` data stream with the site's metadata. Without a transport, as on a
 * self-hosted site, nothing is shipped.
 */
export function createMetrics({
  transport,
  logging,
}: {
  transport: Pick<GhostMetrics, 'metric'>;
  logging: Pick<GhostLogger, 'error'>;
}): Metrics {
  function record<Name extends string, Shape extends TagShape, Event extends string>(
    definition: TrackDefinition<Name, Shape, Event>,
    tags: Tags<Shape>,
    startedAt: number,
    exit: Exit,
  ): void {
    const failed = (err: unknown) =>
      logging.error(
        { event: { name: 'metrics.record.failed' }, err, metric: definition.metric },
        'Recording a tracked attempt failed',
      );
    try {
      const document = {
        ...tags,
        event: { name: definition.name },
        outcome: exit.outcome,
        duration_ms: Math.round(performance.now() - startedAt),
        ...(exit.outcome === 'failure' ? { error: { type: errorTypeOf(exit.err) } } : {}),
      };
      // Shipped after the operation settles and never awaited, so a slow or failing transport
      // can't hold up or change what the operation returns.
      Promise.resolve()
        .then(() => transport.metric(definition.metric, document))
        .catch(failed);
    } catch (err) {
      failed(err);
    }
  }

  function track<Name extends string, Shape extends TagShape, Event extends string, Result>(
    definition: TrackDefinition<Name, Shape, Event>,
    fn: (attempt: Attempt<Shape, Event>) => Promise<Result>,
  ): Promise<Result>;
  function track<Name extends string, Shape extends TagShape, Event extends string, Result>(
    definition: TrackDefinition<Name, Shape, Event>,
    fn: (attempt: Attempt<Shape, Event>) => Result,
  ): Result;
  function track<Name extends string, Shape extends TagShape, Event extends string, Result>(
    definition: TrackDefinition<Name, Shape, Event>,
    fn: (attempt: Attempt<Shape, Event>) => Result | Promise<Result>,
  ): Result | Promise<Result> {
    const startedAt = performance.now();
    const tags: Tags<Shape> = {};
    const attempt: Attempt<Shape, Event> = {
      tag(tag, value) {
        try {
          tags[tag] = definition.tags.shape[tag].parse(value);
        } catch (err) {
          delete tags[tag];
          logging.error(
            { event: { name: 'metrics.tag.invalid' }, err, metric: definition.metric, tag },
            'A tracked attempt was given a tag value it does not have',
          );
        }
      },
      log: {
        error(event, fields, message) {
          logging.error(
            { ...tags, ...fields, event: { name: `${definition.name}.${event}` } },
            message,
          );
        },
      },
    };
    const finish = (exit: Exit) => record(definition, tags, startedAt, exit);

    let result: Result | Promise<Result>;
    try {
      result = fn(attempt);
    } catch (err) {
      finish({ outcome: 'failure', err });
      throw err;
    }
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          finish({ outcome: 'success' });
          return value;
        },
        (err: unknown) => {
          finish({ outcome: 'failure', err });
          throw err;
        },
      );
    }
    finish({ outcome: 'success' });
    return result;
  }

  return { track };
}
