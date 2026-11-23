import assert from 'node:assert/strict';
import { describe, expectTypeOf, it } from 'vitest';
import {
  defineService,
  type Given,
  type ServiceDefinition,
  type ServiceListener,
} from '../src/define-service.ts';
import type { Foundation } from '../src/foundation.ts';

class Published {}

describe('defineService', function () {
  it('describes a service from a create callback, and builds nothing', function () {
    let built = 0;
    const create = () => {
      built += 1;
      return { ready: true };
    };

    const definition = defineService('Example', create);

    assert.equal(built, 0);
    assert.deepEqual(definition, { name: 'Example', needs: {}, create, listeners: [] });
    expectTypeOf(definition).toExtend<ServiceDefinition<{ ready: boolean }>>();
    expectTypeOf(definition.create).returns.toEqualTypeOf<{ ready: boolean }>();
  });

  it('keeps nothing between calls: the same arguments give a new, equal definition', function () {
    const create = () => ({});

    const first = defineService('Example', create);
    const second = defineService('Example', create);

    assert.notEqual(first, second);
    assert.deepEqual(first, second);
  });

  it('takes the options a service uses and leaves out the ones it does not', function () {
    const other = defineService('Other', () => ({ value: 1 }));
    const listeners: ServiceListener<{ doubled: number }>[] = [
      { event: Published, handle: (service) => service.doubled },
    ];
    const start = () => undefined;
    const stop = () => undefined;

    const definition = defineService('Example', {
      needs: { other },
      create: ({ other: built }) => ({ doubled: built.value * 2 }),
      listeners,
      start,
      stop,
    });

    assert.equal(definition.name, 'Example');
    assert.deepEqual(definition.needs, { other });
    assert.equal(definition.listeners, listeners);
    assert.equal(definition.start, start);
    assert.equal(definition.stop, stop);
    assert.equal('extras' in definition, false);

    const withoutOptions = defineService('Plain', { create: () => 1 });
    assert.equal('start' in withoutOptions, false);
    assert.equal('stop' in withoutOptions, false);
  });

  it('hands create the foundation and the instance of each need, by the name it is needed under', function () {
    const clock = defineService('Clock', () => ({ now: (): number => 5 }));
    const definition = defineService('Example', {
      needs: { clock },
      create: (given) => {
        expectTypeOf(given.foundation).toEqualTypeOf<Foundation>();
        expectTypeOf(given.clock).toEqualTypeOf<{ now: () => number }>();
        return given.clock.now();
      },
    });

    // Whoever builds from the definition supplies what is given; the kernel builds nothing.
    const given = { foundation: {}, clock: { now: () => 7 } } as unknown as Given<{
      clock: typeof clock;
    }>;
    assert.equal(definition.create(given), 7);
  });

  it('keeps the extras it is given, as given', function () {
    const extras = { isAvailable: () => true };

    const definition = defineService('Example', () => ({}), extras);

    assert.equal(definition.extras, extras);
    expectTypeOf(definition.extras).toEqualTypeOf<{ isAvailable: () => boolean }>();
  });

  it('refuses, when compiled, a create that returns a promise', function () {
    // @ts-expect-error a service is built synchronously; what it waits for belongs in start
    defineService('Example', async () => ({}));
    defineService('Example', {
      // @ts-expect-error the same, in the options form
      create: async () => ({}),
    });
  });
});
