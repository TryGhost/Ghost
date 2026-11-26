import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import sinon from 'sinon';
import type { EventName } from '#support/site';
import { start, stop } from '../../../bootstrap/app';
import { events } from '../../../bootstrap/events';
import providers from '../../../bootstrap/providers';

const legacyEvents: EventEmitter = require('../../../core/server/lib/common/events');
const DomainEvents = require('@tryghost/domain-events');

const listed = providers.flatMap((provider) => provider.listeners.map(({ event }) => event));
const named = listed.filter((event) => typeof event === 'string');
const classes = listed.filter((event) => typeof event !== 'string');

const count = (event: EventName) =>
  typeof event === 'string'
    ? legacyEvents.listenerCount(event)
    : DomainEvents.ee.listenerCount(event.name);

describe("Starting and stopping the application's listeners", function () {
  beforeEach(function () {
    // Another test file may have left it started.
    stop();
  });

  afterEach(function () {
    stop();
    sinon.restore();
  });

  it('lists listeners for both kinds of event', function () {
    assert.ok(named.length > 0);
    assert.ok(classes.length > 0);
  });

  it('adds one listener for each listed, and stop removes exactly those', function () {
    const added = sinon.spy(events, 'on');
    const removed = sinon.spy(events, 'removeListener');
    const others = named.map((event) => {
      const other = sinon.stub();
      legacyEvents.on(event, other);
      return { event, other };
    });
    const before = named.map(count);

    start();
    assert.deepEqual(
      added.args.map(([event]) => event),
      listed,
    );
    assert.deepEqual(
      named.map(count),
      before.map((listeners, index) => {
        const event = named[index];
        return listeners + named.filter((other) => other === event).length;
      }),
    );

    stop();
    // What is removed is what was added: the same function, for the same event.
    assert.deepEqual(
      removed.args.map(([event, handler]) => [event, handler]),
      added.args.map(([event, handler]) => [event, handler]),
    );
    assert.deepEqual(named.map(count), before);
    for (const { event, other } of others) {
      assert.ok(legacyEvents.listeners(event).includes(other));
      legacyEvents.removeListener(event, other);
    }
  });

  it('adds them once, however often it is started', function () {
    const added = sinon.spy(events, 'on');

    start();
    start();

    assert.equal(added.callCount, listed.length);
  });

  it('adds them again when started after a stop, without subscribing to domain events again', function () {
    start();
    stop();
    const subscriptions = classes.map(count);
    const listeners = named.map(count);

    start();
    assert.deepEqual(classes.map(count), subscriptions);
    assert.deepEqual(
      named.map(count),
      listeners.map((before, index) => {
        const event = named[index];
        return before + named.filter((other) => other === event).length;
      }),
    );

    stop();
    assert.deepEqual(classes.map(count), subscriptions);
    assert.deepEqual(named.map(count), listeners);
  });

  it('does nothing when stopped twice, or before it is started', function () {
    const removed = sinon.spy(events, 'removeListener');

    stop();
    start();
    stop();
    stop();

    assert.equal(removed.callCount, listed.length);
  });
});
