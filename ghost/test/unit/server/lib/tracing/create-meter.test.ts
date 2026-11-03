import assert from 'node:assert/strict';
import { z } from 'zod';
import { createMeter } from '../../../../../core/server/lib/tracing/create-meter';

const LogFields = z.object({ event: z.object({ name: z.string() }) });

/** Waits for the documents `add` ships after returning. */
const shipping = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

function recording(metric = (_name: string, _value: unknown) => Promise.resolve(null)) {
  const shipped: { metric: string; document: unknown }[] = [];
  const logged: unknown[] = [];
  const meter = createMeter({
    transport: {
      metric(name, value) {
        shipped.push({ metric: name, document: value });
        return metric(name, value);
      },
    },
    logging: {
      error(...args: unknown[]) {
        logged.push(LogFields.parse(args[0]).event.name);
      },
    },
  });
  return { meter, shipped, logged };
}

describe('createMeter', function () {
  it('ships each addition with its counter’s name, its value and its attributes', async function () {
    const { meter, shipped } = recording();
    const counter = meter.createCounter('test.things');

    counter.add(1, { 'test.kind': 'plain', rows: 3, tags: [] });
    counter.add(2);

    await shipping();
    expect(shipped).toEqual([
      {
        metric: 'ghost-counters',
        document: {
          '@timestamp': expect.any(Number),
          event: { name: 'test.things' },
          value: 1,
          labels: { test_kind: 'plain' },
          numeric_labels: { rows: 3 },
        },
      },
      {
        metric: 'ghost-counters',
        document: {
          '@timestamp': expect.any(Number),
          event: { name: 'test.things' },
          value: 2,
          labels: {},
          numeric_labels: {},
        },
      },
    ]);
  });

  it('never throws, and logs a failure to ship', async function () {
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
      const { meter, logged } = recording(metric);

      assert.doesNotThrow(() => meter.createCounter('test.things').add(1));
      await shipping();
      assert.deepEqual(logged, logs);
    }
  });
});
