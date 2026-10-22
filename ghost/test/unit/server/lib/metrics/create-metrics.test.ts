import assert from 'node:assert/strict';
import { ValidationError } from '@tryghost/errors';
import { z } from 'zod';
import { createMetrics } from '../../../../../core/server/lib/metrics/create-metrics';
import { defineTrack } from '../../../../../core/server/lib/metrics/track';

const Operation = defineTrack({
  name: 'test.operation',
  tags: z.object({ kind: z.enum(['plain', 'fancy']) }),
  events: ['went_wrong'],
});

const Document = z.record(z.string(), z.unknown());
const LogFields = z.object({ event: z.object({ name: z.string() }) });

/** Lets an attempt, shipped once its operation settles, reach the transport. */
const shipping = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

/** Metrics over a transport and logger that record what they're given. */
function recording(metric = (_name: string, _value: unknown) => Promise.resolve(null)) {
  const shipped: Record<string, unknown>[] = [];
  const logged: [unknown, unknown][] = [];
  const metrics = createMetrics({
    transport: {
      metric(name, value) {
        // Each attempt's duration varies, so it's checked here and left out.
        const { duration_ms: took, ...attempt } = Document.parse(value);
        assert.ok(typeof took === 'number' && took >= 0);
        shipped.push({ metric: name, ...attempt });
        return metric(name, value);
      },
    },
    logging: {
      error(fields: unknown, message: unknown) {
        logged.push([fields, message]);
      },
    },
  });
  const loggedEvents = () => logged.map(([fields]) => LogFields.parse(fields).event.name);
  return { metrics, shipped, logged, loggedEvents };
}

describe('createMetrics', function () {
  it('records a synchronous operation, returning its result and rethrowing its error unchanged', async function () {
    const { metrics, shipped } = recording();
    const failure = new TypeError('Not a session');

    const result = metrics.track(Operation, (attempt) => {
      attempt.tag('kind', 'plain');
      return 'paid';
    });
    assert.equal(result, 'paid');
    assert.throws(
      () =>
        metrics.track(Operation, () => {
          throw failure;
        }),
      (err) => err === failure,
    );

    await shipping();
    assert.deepEqual(shipped, [
      {
        metric: 'test-operation',
        kind: 'plain',
        event: { name: 'test.operation' },
        outcome: 'success',
      },
      {
        metric: 'test-operation',
        event: { name: 'test.operation' },
        outcome: 'failure',
        error: { type: 'TypeError' },
      },
    ]);
  });

  it('names a failure by its code, else its Ghost error type, else its class, never its message', async function () {
    const { metrics, shipped } = recording();
    class StripeConnectionError extends Error {}
    const failures = [
      Object.assign(new Error('Invalid email address: buyer@example'), { code: 'email_invalid' }),
      new ValidationError({ message: 'Not a tier' }),
      new StripeConnectionError('Could not reach Stripe'),
      'not an error',
    ];

    for (const failure of failures) {
      await assert.rejects(
        metrics.track(Operation, async () => {
          throw failure;
        }),
      );
    }

    await shipping();
    assert.deepEqual(
      shipped.map(({ error }) => error),
      [
        { type: 'email_invalid' },
        { type: 'ValidationError' },
        { type: 'StripeConnectionError' },
        { type: '_OTHER' },
      ],
    );
  });

  it('leaves the result standing when shipping fails or never finishes, and logs a failure', async function () {
    const transports = [
      {
        metric: () => {
          throw new Error('Elasticsearch is down');
        },
        logs: ['metrics.record.failed'],
      },
      {
        metric: () => Promise.reject(new Error('Elasticsearch is down')),
        logs: ['metrics.record.failed'],
      },
      { metric: () => new Promise<null>(() => {}), logs: [] },
    ];

    for (const { metric, logs } of transports) {
      const { metrics, loggedEvents } = recording(metric);

      assert.equal(await metrics.track(Operation, async () => 'paid'), 'paid');
      await shipping();
      assert.deepEqual(loggedEvents(), logs);
    }
  });

  it('logs as the operation, with its tags', async function () {
    const { metrics, logged } = recording();
    const err = new Error('Refused');

    await metrics.track(Operation, async (attempt) => {
      attempt.tag('kind', 'fancy');
      attempt.log.error('went_wrong', { err }, 'The operation went wrong');
    });

    assert.deepEqual(logged, [
      [
        { kind: 'fancy', err, event: { name: 'test.operation.went_wrong' } },
        'The operation went wrong',
      ],
    ]);
  });

  it('leaves out and logs a tag value the tag does not have, still recording the attempt', async function () {
    const { metrics, shipped, loggedEvents } = recording();

    await metrics.track(Operation, async (attempt) => {
      attempt.tag('kind', 'plain');
      // @ts-expect-error A value outside the tag's enum, as an untyped caller could pass.
      attempt.tag('kind', 'gold');
    });

    await shipping();
    assert.deepEqual(shipped, [
      { metric: 'test-operation', event: { name: 'test.operation' }, outcome: 'success' },
    ]);
    assert.deepEqual(loggedEvents(), ['metrics.tag.invalid']);
  });
});
