import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { events } from '../../../bootstrap/events';

const legacyEvents: EventEmitter = require('../../../core/server/lib/common/events');
const DomainEvents = require('@tryghost/domain-events');

type EventClass = new () => object;
type Listener = (event: object) => unknown;

describe("The site's events", function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('named by a string', function () {
    it('are the legacy bus: a listener is added to it and removed from it', function () {
      const listener = sinon.stub();
      const before = legacyEvents.listenerCount('bootstrap.test');

      events.on('bootstrap.test', listener);
      assert.equal(legacyEvents.listenerCount('bootstrap.test'), before + 1);
      legacyEvents.emit('bootstrap.test', 'a', 'b');
      sinon.assert.calledOnceWithExactly(listener, 'a', 'b');

      events.removeListener('bootstrap.test', listener);
      assert.equal(legacyEvents.listenerCount('bootstrap.test'), before);
    });

    // Today's behaviour, and intended: the legacy bus is a plain emitter.
    it('hand a listener that throws to whoever emitted, and call no listener after it', function () {
      const failure = new Error('listener failed');
      const first = sinon.stub().throws(failure);
      const second = sinon.stub();
      events.on('bootstrap.throwing', first);
      events.on('bootstrap.throwing', second);

      try {
        assert.throws(
          () => legacyEvents.emit('bootstrap.throwing'),
          (thrown) => thrown === failure,
        );
        sinon.assert.notCalled(second);
      } finally {
        events.removeListener('bootstrap.throwing', first);
        events.removeListener('bootstrap.throwing', second);
      }
    });

    it('remove only the listener named, leaving others on the same event', function () {
      const ours = sinon.stub();
      const theirs = sinon.stub();
      legacyEvents.on('bootstrap.shared', theirs);
      events.on('bootstrap.shared', ours);

      events.removeListener('bootstrap.shared', ours);
      legacyEvents.emit('bootstrap.shared');

      sinon.assert.notCalled(ours);
      sinon.assert.calledOnce(theirs);
      legacyEvents.removeListener('bootstrap.shared', theirs);
    });
  });

  describe('named by a class', function () {
    class SomethingHappened {
      data: { id: string };
      timestamp = new Date();

      constructor(data: { id: string }) {
        this.data = data;
      }
    }

    it('are domain events: a listener hears what is dispatched, until it is removed', async function () {
      const listener = sinon.stub().resolves();
      const event = new SomethingHappened({ id: 'one' });

      events.on(SomethingHappened, listener);
      DomainEvents.dispatch(event);
      await DomainEvents.allSettled();
      sinon.assert.calledOnceWithExactly(listener, event);

      events.removeListener(SomethingHappened, listener);
      DomainEvents.dispatch(new SomethingHappened({ id: 'two' }));
      await DomainEvents.allSettled();
      sinon.assert.calledOnce(listener);
    });

    it('subscribe to domain events once for a class, however often listeners come and go', function () {
      class AnotherThingHappened {}
      const subscribe = sinon.spy(DomainEvents, 'subscribe');
      const first = sinon.stub();
      const second = sinon.stub();

      events.on(AnotherThingHappened, first);
      events.removeListener(AnotherThingHappened, first);
      events.on(AnotherThingHappened, second);

      sinon.assert.calledOnce(subscribe);
    });

    it('wait for every listener before domain events count the event as handled', async function () {
      class SlowThingHappened {}
      let finished = false;
      const listener = async () => {
        await setImmediate();
        finished = true;
      };

      events.on(SlowThingHappened, listener);
      DomainEvents.dispatch(new SlowThingHappened());
      await DomainEvents.allSettled();

      assert.equal(finished, true);
      events.removeListener(SlowThingHappened, listener);
    });

    it('call a listener again after it is removed and added back, once for each event', async function () {
      class RestartedThingHappened {}
      const listener = sinon.stub().resolves();

      events.on(RestartedThingHappened, listener);
      events.removeListener(RestartedThingHappened, listener);
      DomainEvents.dispatch(new RestartedThingHappened());
      await DomainEvents.allSettled();
      sinon.assert.notCalled(listener);

      events.on(RestartedThingHappened, listener);
      DomainEvents.dispatch(new RestartedThingHappened());
      await DomainEvents.allSettled();
      sinon.assert.calledOnce(listener);
      events.removeListener(RestartedThingHappened, listener);
    });

    it('add a listener once, however often it is added', async function () {
      class RepeatedThingHappened {}
      const listener = sinon.stub().resolves();

      events.on(RepeatedThingHappened, listener);
      events.on(RepeatedThingHappened, listener);
      DomainEvents.dispatch(new RepeatedThingHappened());
      await DomainEvents.allSettled();

      // Unlike an emitter, which would call it twice. The application never adds one twice.
      sinon.assert.calledOnce(listener);
      events.removeListener(RepeatedThingHappened, listener);
    });
  });

  /**
   * A listener added through the site must be treated as one that subscribed to
   * domain events itself. Each case runs both ways and must come out the same.
   */
  describe.each([
    {
      way: 'subscribed to domain events directly',
      add: (Event: EventClass, listener: Listener) => DomainEvents.subscribe(Event, listener),
    },
    {
      way: 'added through the site',
      add: (Event: EventClass, listener: Listener) => events.on(Event, listener),
    },
  ])('Listeners for a class, $way', function ({ add }) {
    let Raised: EventClass;
    let logged: sinon.SinonStub;

    beforeEach(function () {
      // A class of its own for each case, so no case hears another's listeners.
      Raised = class Happened {};
      logged = sinon.stub(require('@tryghost/logging'), 'error');
    });

    afterEach(function () {
      // Domain events name a class by its name, so each case clears what it subscribed.
      DomainEvents.ee.removeAllListeners('Happened');
    });

    it('are each called with the event, in the order they were added', async function () {
      const order: string[] = [];
      const event = new Raised();
      const first = sinon.stub().callsFake(() => void order.push('first'));
      const second = sinon.stub().callsFake(async () => void order.push('second'));
      const third = sinon.stub().callsFake(() => void order.push('third'));
      add(Raised, first);
      add(Raised, second);
      add(Raised, third);

      DomainEvents.dispatch(event);
      // Every listener has started by the time dispatch returns.
      assert.deepEqual(order, ['first', 'second', 'third']);
      await DomainEvents.allSettled();

      sinon.assert.calledOnceWithExactly(first, event);
      sinon.assert.calledOnceWithExactly(second, event);
      sinon.assert.calledOnceWithExactly(third, event);
    });

    it('are all called when the first throws, and the error is logged, not thrown', async function () {
      const failure = new Error('listener threw');
      const first = sinon.stub().throws(failure);
      const second = sinon.stub();
      add(Raised, first);
      add(Raised, second);

      assert.doesNotThrow(() => DomainEvents.dispatch(new Raised()));
      await DomainEvents.allSettled();

      sinon.assert.calledOnce(second);
      sinon.assert.calledWithExactly(
        logged,
        'Unhandled error in event handler for event: Happened',
      );
      sinon.assert.calledWithExactly(logged, failure);
    });

    it('are all called when the first rejects, and the error is logged', async function () {
      const failure = new Error('listener rejected');
      const first = sinon.stub().rejects(failure);
      const second = sinon.stub().resolves();
      add(Raised, first);
      add(Raised, second);

      DomainEvents.dispatch(new Raised());
      await DomainEvents.allSettled();

      sinon.assert.calledOnce(second);
      sinon.assert.calledWithExactly(
        logged,
        'Unhandled error in event handler for event: Happened',
      );
      sinon.assert.calledWithExactly(logged, failure);
    });

    it('are all waited for by allSettled, even after one has failed', async function () {
      const finished: string[] = [];
      add(Raised, async () => {
        throw new Error('listener rejected at once');
      });
      add(Raised, async () => {
        await setImmediate();
        await setImmediate();
        finished.push('slow');
      });
      add(Raised, async () => {
        await setImmediate();
        finished.push('quick');
      });

      DomainEvents.dispatch(new Raised());
      assert.deepEqual(finished, []);
      await DomainEvents.allSettled();

      assert.deepEqual(finished, ['quick', 'slow']);
    });

    it('are not needed: an event nobody listens for is dispatched and settles', async function () {
      class Unheard {}

      assert.doesNotThrow(() => DomainEvents.dispatch(new Unheard()));
      await DomainEvents.allSettled();
    });
  });

  it('settle an event whose only listener was removed, calling nobody', async function () {
    class AbandonedThingHappened {}
    const listener = sinon.stub();
    events.on(AbandonedThingHappened, listener);
    events.removeListener(AbandonedThingHappened, listener);

    assert.doesNotThrow(() => DomainEvents.dispatch(new AbandonedThingHappened()));
    await DomainEvents.allSettled();

    sinon.assert.notCalled(listener);
  });
});
