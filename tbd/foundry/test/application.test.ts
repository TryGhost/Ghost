import assert from 'node:assert/strict';
import { defineService } from '@tryghost/kernel/define-service';
import type { Foundation } from '@tryghost/kernel/foundation';
import { describe, it } from 'vitest';
import { createApplication, type Step } from '../src/application.ts';

function fakeFoundation() {
  const logged: unknown[][] = [];
  const foundation = {
    logger: { error: (...messages: unknown[]) => logged.push(messages) },
    events: { subscribe: () => () => {}, dispatch: () => {} },
  } as unknown as Foundation;
  return { foundation, logged };
}

describe('createApplication', function () {
  it('holds the foundation it is given and services of its own, reading nothing', function () {
    // Any read of the foundation would throw.
    const foundation = new Proxy(
      {},
      {
        get(_, property) {
          throw new Error(`Read ${String(property)} while the application was being built`);
        },
      },
    ) as Foundation;

    const application = createApplication({ name: 'Example', foundation });
    const other = createApplication({ name: 'Other', foundation });

    assert.equal(application.name, 'Example');
    assert.equal(application.foundation, foundation);
    assert.equal(application.services.isOpen, false);
    assert.notEqual(application.services, other.services);
  });

  describe('start', function () {
    it('runs the steps it is given in order, each to completion, handing each the same run', async function () {
      const { foundation } = fakeFoundation();
      const application = createApplication({ name: 'Example', foundation });
      const order: string[] = [];
      let release!: () => void;
      const steps: Step<{ seen: unknown[] }>[] = [
        {
          name: 'first',
          run: async (run) => {
            run.state.seen.push(run.foundation, run.services);
            await new Promise<void>((resolve) => {
              release = resolve;
            });
            order.push('first');
          },
        },
        { name: 'second', run: () => order.push('second') },
      ];
      const state = { seen: [] as unknown[] };

      const starting = application.start(steps, state);
      await Promise.resolve();
      assert.deepEqual(order, []);
      release();

      assert.equal(await starting, state);
      assert.deepEqual(order, ['first', 'second']);
      assert.deepEqual(state.seen, [foundation, application.services]);
    });

    it('ends the start with the error of a step that fails, and runs none after it', async function () {
      const { foundation } = fakeFoundation();
      const application = createApplication({ name: 'Example', foundation });
      const failure = new Error('Step failed');
      const ran: string[] = [];

      await assert.rejects(
        application.start(
          [
            { name: 'first', run: () => ran.push('first') },
            {
              name: 'second',
              run: () => {
                throw failure;
              },
            },
            { name: 'third', run: () => ran.push('third') },
          ],
          {},
        ),
        failure,
      );

      assert.deepEqual(ran, ['first']);
    });
  });

  describe('stop', function () {
    it('undoes what the steps registered, last first, then closes the services', async function () {
      const { foundation } = fakeFoundation();
      const application = createApplication({ name: 'Example', foundation });
      const stopped: string[] = [];
      const definition = defineService('Example', () => ({}));

      await application.start(
        [
          { name: 'server', run: (run) => run.onStop('server', () => stopped.push('server')) },
          {
            name: 'services',
            run: (run) => {
              run.services.open();
              run.onStop('jobs', async () => {
                await Promise.resolve();
                // Services are still open while what was started is being stopped.
                stopped.push(`jobs (services open: ${String(run.services.isOpen)})`);
              });
            },
          },
        ],
        {},
      );
      application.services.get(definition);
      await application.stop();

      assert.deepEqual(stopped, ['jobs (services open: true)', 'server']);
      assert.equal(application.services.isOpen, false);

      // Nothing is undone twice.
      await application.stop();
      assert.equal(stopped.length, 2);
    });

    it('also undoes what a failed start had registered', async function () {
      const { foundation } = fakeFoundation();
      const application = createApplication({ name: 'Example', foundation });
      const stopped: string[] = [];

      await assert.rejects(
        application.start(
          [
            { name: 'server', run: (run) => run.onStop('server', () => stopped.push('server')) },
            {
              name: 'fails',
              run: () => {
                throw new Error('Step failed');
              },
            },
          ],
          {},
        ),
      );
      await application.stop();

      assert.deepEqual(stopped, ['server']);
    });

    it('can be asked for by a step, which then stops the application', async function () {
      const { foundation } = fakeFoundation();
      const application = createApplication({ name: 'Example', foundation });
      const stopped: string[] = [];
      let shutDown!: () => Promise<void>;

      await application.start(
        [
          {
            name: 'server',
            run: (run) => {
              shutDown = run.stop;
              run.onStop('server', () => stopped.push('server'));
            },
          },
        ],
        {},
      );
      await shutDown();

      assert.deepEqual(stopped, ['server']);
    });

    it('logs what it could not stop and stops the rest', async function () {
      const { foundation, logged } = fakeFoundation();
      const application = createApplication({ name: 'Example', foundation });
      const failure = new Error('Could not stop');
      const stopped: string[] = [];

      await application.start(
        [
          {
            name: 'both',
            run: (run) => {
              run.onStop('first', () => stopped.push('first'));
              run.onStop('second', () => {
                throw failure;
              });
            },
          },
        ],
        {},
      );
      await application.stop();

      assert.deepEqual(logged, [['Example could not stop second', failure]]);
      assert.deepEqual(stopped, ['first']);
    });
  });
});
