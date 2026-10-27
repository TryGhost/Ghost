import assert from 'node:assert/strict';
import { ValidationError } from '@tryghost/errors';
import { z } from 'zod';
import { createTracer } from '../../../../../core/server/lib/tracing/create-tracer';

const LogFields = z.object({ event: z.object({ name: z.string() }) });

/** Waits for the spans `track` ships after returning. */
const shipping = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

function recording(metric = (_name: string, _value: unknown) => Promise.resolve(null)) {
  const shipped: { metric: string; document: unknown }[] = [];
  const logged: unknown[] = [];
  const tracer = createTracer({
    transport: {
      metric(name, value) {
        shipped.push({ metric: name, document: value });
        return metric(name, value);
      },
    },
    logging: {
      error(fields: unknown) {
        logged.push(LogFields.parse(fields).event.name);
      },
    },
  });
  return { tracer, shipped, logged };
}

describe('createTracer', function () {
  it('names a failure by its code, else its name or class, never its message', async function () {
    const { tracer, shipped } = recording();
    class StripeConnectionError extends Error {}
    const failures = [
      Object.assign(new Error('Invalid email address: buyer@example'), { code: 'email_invalid' }),
      new ValidationError({ message: 'Not a tier' }),
      new StripeConnectionError('Could not reach Stripe'),
      'not an error',
    ];

    for (const failure of failures) {
      await assert.rejects(
        tracer.track('test.operation', async (span) => {
          span.setAttribute('test.kind', 'plain');
          throw failure;
        }),
        (err) => err === failure,
      );
    }

    await shipping();
    expect(shipped).toEqual(
      ['email_invalid', 'ValidationError', 'StripeConnectionError', '_OTHER'].map((type) => ({
        metric: 'ghost-spans',
        document: {
          '@timestamp': expect.any(Number),
          event: { name: 'test.operation', outcome: 'failure', duration: expect.any(Number) },
          error: { type },
          labels: { test_kind: 'plain' },
          numeric_labels: {},
        },
      })),
    );
  });

  it('keeps numbers apart from the other attributes, as Elastic stores them, and drops empty lists', async function () {
    const { tracer, shipped } = recording();

    await tracer.track('test.operation', async (span) => {
      span.setAttribute('mode', 'inline');
      span.setAttribute('has_custom_fields', true);
      span.setAttribute('field_types', ['address', 'short_text']);
      span.setAttribute('rows', 3);
      span.setAttribute('sizes', [1, 2]);
      span.setAttribute('replaced', 'first');
      span.setAttribute('replaced', 2);
      span.setAttribute('emptied', ['a']);
      span.setAttribute('emptied', []);
    });

    await shipping();
    expect(shipped).toEqual([
      {
        metric: 'ghost-spans',
        document: expect.objectContaining({
          labels: {
            mode: 'inline',
            has_custom_fields: true,
            field_types: ['address', 'short_text'],
          },
          numeric_labels: { rows: 3, sizes: [1, 2], replaced: 2 },
        }),
      },
    ]);
  });

  it('ships a list as it was when set, however it changes afterwards', async function () {
    const { tracer, shipped } = recording();
    const types = ['short_text'];

    await tracer.track('test.operation', async (span) => {
      span.setAttribute('field_types', types);
      types.push('address');
    });

    await shipping();
    expect(shipped).toEqual([
      {
        metric: 'ghost-spans',
        document: expect.objectContaining({ labels: { field_types: ['short_text'] } }),
      },
    ]);
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
      const { tracer, logged } = recording(metric);

      assert.equal(await tracer.track('test.operation', async () => 'paid'), 'paid');
      await shipping();
      assert.deepEqual(logged, logs);
    }
  });
});
