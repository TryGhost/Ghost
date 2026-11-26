import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { events } from '../../../bootstrap/events';

const legacyEvents: EventEmitter = require('../../../core/server/lib/common/events');
const DomainEvents = require('@tryghost/domain-events');

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
  });
});
