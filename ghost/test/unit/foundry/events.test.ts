import assert from 'node:assert/strict';
import { createEventBus } from '../../../core/foundry/events';

describe('createEventBus', function () {
  it('delivers an event to the handlers subscribed to its class name', function () {
    const bus = createEventBus({ logging: { error() {} } });
    const seen: string[] = [];
    class Lent {}
    class Returned {}
    bus.subscribe(Lent, () => seen.push('first'));
    bus.subscribe({ name: 'Lent' }, () => seen.push('by name'));
    bus.subscribe(Returned, () => seen.push('other'));
    bus.dispatch(new Lent());
    assert.deepEqual(seen, ['first', 'by name']);
  });

  it('logs a failing handler and still runs the others', async function () {
    const logged: unknown[] = [];
    const bus = createEventBus({ logging: { error: (value: unknown) => logged.push(value) } });
    const failure = new Error('handler failed');
    const seen: string[] = [];
    class Lent {}
    bus.subscribe(Lent, async () => {
      throw failure;
    });
    bus.subscribe(Lent, () => seen.push('still ran'));
    bus.dispatch(new Lent());
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    assert.deepEqual(seen, ['still ran']);
    assert.deepEqual(logged, ['Unhandled error in event handler for event: Lent', failure]);
  });

  it('keeps each bus to itself', function () {
    const first = createEventBus({ logging: { error() {} } });
    const second = createEventBus({ logging: { error() {} } });
    let seen = 0;
    class Lent {}
    first.subscribe(Lent, () => (seen += 1));
    second.dispatch(new Lent());
    assert.equal(seen, 0);
  });
});
