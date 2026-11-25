import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import Redis from 'ioredis';
import sinon from 'sinon';
import { InvalidationsService } from '../../../../core/server/services/invalidations/invalidations-service';
import { RedisTransport } from '../../../../core/server/services/invalidations/redis-transport';
import type { TransportHandlers } from '../../../../core/server/services/invalidations/transport';
import { createLoggingFake } from '../../../utils/logging-utils';
import { RedisProxy, eventually, redis } from './redis-test-utils';

// Skipped unless the integration globalSetup found Redis (vitest-globalsetup-services.ts).
describe.skipIf(process.env.GHOST_TEST_REDIS_AVAILABLE !== '1')(
  'Integration: invalidations over Redis',
  function () {
    const heartbeat = { intervalMs: 25, timeoutMs: 250 };
    const closing: Array<() => Promise<unknown>> = [];
    let channel: string;
    let proxy: RedisProxy;
    let proxied: { host: string; port: number };

    // Long enough for a loaded CI runner to subscribe; tests of a Redis that
    // is away pass a short one
    function transport(connection = redis, firstConnectionWaitMs = 2000) {
      const logging = createLoggingFake();
      const created = new RedisTransport({
        // Retry fast, so a test does not wait on ioredis' backoff
        connection: { ...connection, retryStrategy: () => 20 },
        channel,
        logging,
        heartbeat,
        firstConnectionWaitMs,
      });
      closing.push(() => created.close());
      return { transport: created, logging };
    }

    function handlers() {
      return {
        onMessage: sinon
          .stub<Parameters<TransportHandlers['onMessage']>, Promise<void>>()
          .resolves(),
        onConnectionLost: sinon.stub<[], void>(),
        onReconnected: sinon.stub<[], Promise<void>>().resolves(),
      };
    }

    beforeEach(async function () {
      channel = `ghost:invalidations:test:${randomUUID()}`;
      proxy = new RedisProxy(redis);
      proxied = await proxy.listen();
      closing.push(() => proxy.close());
    });

    afterEach(async function () {
      await Promise.all(closing.splice(0).map((close) => close()));
    });

    it("runs a peer's callback and not its own, logging how late it arrived", async function () {
      const { transport: aTransport, logging: aLogging } = transport();
      const { transport: bTransport, logging: bLogging } = transport();
      const a = new InvalidationsService({
        transport: aTransport,
        instanceId: 'a',
        logging: aLogging,
      });
      const b = new InvalidationsService({
        transport: bTransport,
        instanceId: 'b',
        logging: bLogging,
      });
      await Promise.all([a.start(), b.start()]);
      const ownCallback = sinon.stub();
      const peerCallback = sinon.stub();
      const handle = a.register('tiers', ownCallback);
      b.register('tiers', peerCallback);

      await handle.notifyPeers();
      await eventually(() => peerCallback.called, 'The peer did not receive the invalidation');
      // a hears its own message on the same channel; give it time to arrive
      await wait(100);

      sinon.assert.calledOnce(peerCallback);
      sinon.assert.notCalled(ownCallback);
      sinon.assert.calledWithMatch(bLogging.info, {
        event: { name: 'invalidations.received' },
        invalidation: { name: 'tiers', origin: 'a', deliveryLatencyMs: sinon.match.number },
      });
    });

    it('keeps heartbeats to itself', async function () {
      const a = transport();
      const b = transport();
      const received = handlers();
      await Promise.all([a.transport.subscribe(handlers()), b.transport.subscribe(received)]);

      // Several of both instances' heartbeats, and longer than the timeout
      await wait(heartbeat.timeoutMs * 2);

      sinon.assert.notCalled(received.onMessage);
      sinon.assert.notCalled(received.onConnectionLost);
      sinon.assert.notCalled(b.logging.warn);
    });

    for (const [when, delayMs] of [
      ['as the connection drops', 0],
      ['after the connection dropped', 60],
    ] as const) {
      it(`holds a message published ${when} and sends it once on reconnecting`, async function () {
        const sender = transport(proxied);
        const receiver = transport();
        const received = handlers();
        await Promise.all([
          sender.transport.subscribe(handlers()),
          receiver.transport.subscribe(received),
        ]);

        proxy.cut();
        await wait(delayMs);
        await sender.transport.publish({ name: 'settings', origin: 'sender', sentAt: 1 });
        await sender.transport.publish({ name: 'settings', origin: 'sender', sentAt: 2 });
        await wait(100);
        sinon.assert.notCalled(received.onMessage);
        sinon.assert.calledWithMatch(sender.logging.warn, {
          event: { name: 'invalidations.redis.publish.held' },
          invalidation: { name: 'settings' },
        });

        proxy.restore();
        await eventually(() => received.onMessage.called, 'The held message was never delivered');
        await wait(100);
        sinon.assert.calledOnceWithExactly(received.onMessage, {
          name: 'settings',
          origin: 'sender',
          sentAt: 2,
        });
        sinon.assert.calledWithMatch(sender.logging.info, {
          event: { name: 'invalidations.redis.publish.released' },
          invalidation: { name: 'settings' },
        });
      });
    }

    it('holds a message whose publish was waiting on Redis when the connection closed, and sends it on reconnecting', async function () {
      const sender = transport(proxied);
      const receiver = transport();
      const received = handlers();
      await Promise.all([
        sender.transport.subscribe(handlers()),
        receiver.transport.subscribe(received),
      ]);
      proxy.silence();
      const sent = proxy.sent('"origin":"sender"');
      const publishing = sender.transport.publish({ name: 'settings', origin: 'sender' });
      await sent;

      proxy.cut();
      await publishing;
      sinon.assert.calledWithMatch(sender.logging.warn, {
        event: { name: 'invalidations.redis.publish.held' },
        invalidation: { name: 'settings' },
      });

      proxy.restore();
      await eventually(() => received.onMessage.called, 'The held message was never delivered');
    });

    it('sends a message Redis refused on an open connection once Redis accepts it again', async function () {
      const sender = transport(proxied);
      const receiver = transport();
      const received = handlers();
      await Promise.all([
        sender.transport.subscribe(handlers()),
        receiver.transport.subscribe(received),
      ]);
      const accepted = proxy.accepted;
      proxy.failOn('"origin":"sender"', 'BUSY Redis is busy running a script');

      await sender.transport.publish({ name: 'settings', origin: 'sender' });
      sinon.assert.calledWithMatch(sender.logging.warn, {
        event: { name: 'invalidations.redis.publish.held' },
        invalidation: { name: 'settings' },
      });

      proxy.answer();
      await eventually(() => received.onMessage.called, 'The held message was never delivered');
      assert.equal(proxy.accepted, accepted, 'The sender reconnected to send it');
    });

    it('rejects a publish made after it closed', async function () {
      const closed = transport();
      await closed.transport.subscribe(handlers());
      await closed.transport.close();

      await assert.rejects(closed.transport.publish({ name: 'settings', origin: 'sender' }));
    });

    it('rejects a publish that was waiting on Redis when it closed', async function () {
      const shuttingDown = transport(proxied);
      await shuttingDown.transport.subscribe(handlers());
      proxy.silence();
      const sent = proxy.sent('"origin":"sender"');
      const publishing = shuttingDown.transport.publish({ name: 'settings', origin: 'sender' });
      await sent;
      const rejected = assert.rejects(publishing);

      await Promise.all([shuttingDown.transport.close(), rejected]);
    });

    it('reconnects after another outage when it was closed while retrying and subscribed again', async function () {
      const restarted = transport(proxied);
      const first = handlers();
      await restarted.transport.subscribe(first);
      proxy.cut();
      await eventually(() => first.onConnectionLost.called, 'It did not notice the outage');
      // ioredis retries every 20ms here, and spends nearly all of that waiting
      await wait(100);
      await restarted.transport.close();
      proxy.restore();
      const again = handlers();
      await restarted.transport.subscribe(again);
      sinon.assert.notCalled(again.onConnectionLost);

      proxy.cut();
      await eventually(() => again.onConnectionLost.called, 'It did not notice the second outage');
      proxy.restore();

      await eventually(() => again.onReconnected.called, 'It never reconnected');
    });

    it('rejects a publish that closing dropped even when it subscribes again straight away', async function () {
      const restarted = transport(proxied);
      await restarted.transport.subscribe(handlers());
      proxy.silence();
      const sent = proxy.sent('"origin":"sender"');
      const publishing = restarted.transport.publish({ name: 'settings', origin: 'sender' });
      await sent;
      const rejected = assert.rejects(publishing);

      await restarted.transport.close();
      await Promise.all([restarted.transport.subscribe(handlers()), rejected]);
    });

    it('tells only the latest subscription about its own connection when closed while connecting', async function () {
      proxy.silence({ newConnections: true });
      const restarted = transport(proxied, 100);
      const first = handlers();
      const firstSubscribing = restarted.transport.subscribe(first);
      await restarted.transport.close();
      const second = handlers();

      await Promise.all([firstSubscribing, restarted.transport.subscribe(second)]);

      sinon.assert.notCalled(first.onConnectionLost);
      sinon.assert.calledOnce(second.onConnectionLost);
      proxy.answer();
      await eventually(() => second.onReconnected.called, 'It never connected');
    });

    it('subscribes again straight after closing', async function () {
      const restarted = transport();
      await restarted.transport.subscribe(handlers());
      await restarted.transport.close();
      const again = handlers();

      await restarted.transport.subscribe(again);

      sinon.assert.notCalled(again.onConnectionLost);
      const peer = transport();
      await peer.transport.subscribe(handlers());
      await peer.transport.publish({ name: 'settings', origin: 'peer' });
      await eventually(() => again.onMessage.called, 'It is not subscribed again');
    });

    for (const [state, prepare] of [
      ['Redis has not answered it', () => proxy.silence({ newConnections: true })],
      ['Redis is away', () => proxy.cut()],
    ] as const) {
      it(`closes while ${state}`, async function () {
        prepare();
        const waiting = transport(proxied, 100);
        await waiting.transport.subscribe(handlers());

        await waiting.transport.close();
      });
    }

    for (const [what, raw, expected] of [
      [
        'passes on when it was sent and nothing else a message carries',
        { name: 'x', origin: 'peer', sentAt: 1234, value: 'secret' },
        { name: 'x', origin: 'peer', sentAt: 1234 },
      ],
      [
        'passes on a message whose send time is not a number without it',
        { name: 'x', origin: 'peer', sentAt: 'yesterday' },
        { name: 'x', origin: 'peer' },
      ],
    ] as const) {
      it(what, async function () {
        const receiver = transport();
        const received = handlers();
        await receiver.transport.subscribe(received);
        const client = new Redis(redis);
        closing.push(async () => client.disconnect());

        await client.publish(channel, JSON.stringify(raw));
        await eventually(() => received.onMessage.called, 'The message was never delivered');

        sinon.assert.calledOnceWithExactly(received.onMessage, expected);
      });
    }

    it('drops a message without a name or origin', async function () {
      const receiver = transport();
      const received = handlers();
      await receiver.transport.subscribe(received);
      const client = new Redis(redis);
      closing.push(async () => client.disconnect());

      await client.publish(channel, JSON.stringify({ name: 'x', sentAt: 1 }));
      await client.publish(channel, JSON.stringify({ origin: 'peer', sentAt: 1 }));
      await eventually(
        () => receiver.logging.warn.callCount >= 2,
        'The malformed messages were not reported',
      );

      sinon.assert.notCalled(received.onMessage);
      sinon.assert.calledWithMatch(receiver.logging.warn, {
        event: { name: 'invalidations.redis.malformed' },
      });
    });

    it('starts while Redis is away and reports reconnecting once it is back', async function () {
      proxy.cut();
      const late = transport(proxied, 100);
      const lateHandlers = handlers();

      await late.transport.subscribe(lateHandlers);

      sinon.assert.calledOnce(lateHandlers.onConnectionLost);
      sinon.assert.notCalled(lateHandlers.onReconnected);
      sinon.assert.calledWithMatch(late.logging.error, {
        event: { name: 'invalidations.redis.unavailable' },
      });

      proxy.restore();
      await eventually(() => lateHandlers.onReconnected.called, 'It never connected to Redis');

      const peer = transport();
      await peer.transport.subscribe(handlers());
      await peer.transport.publish({ name: 'settings', origin: 'peer' });
      await eventually(() => lateHandlers.onMessage.called, 'It is not subscribed');
    });

    it('logs one connection error per connection for an outage, however often it retries', async function () {
      const cutOff = transport(proxied);
      await cutOff.transport.subscribe(handlers());

      proxy.cut();
      // ioredis retries every 20ms here, so this is a few dozen failed attempts
      await wait(500);

      const errors = cutOff.logging.warn
        .getCalls()
        .filter((call) =>
          sinon.match({ event: { name: 'invalidations.redis.error' } }).test(call.args[0]),
        );
      assert.ok(errors.length <= 2, `Logged ${errors.length} connection errors`);
    });

    it('waits on a silent connection for many publishes without piling up listeners', async function () {
      const warnings: Error[] = [];
      const onWarning = (warning: Error) => warnings.push(warning);
      process.on('warning', onWarning);
      closing.push(async () => process.removeListener('warning', onWarning));
      const silenced = transport(proxied);
      await silenced.transport.subscribe(handlers());

      proxy.silence();
      for (let i = 0; i < 12; i++) {
        // Rejected when the test closes the transport
        silenced.transport.publish({ name: 'settings', origin: 'sender' }).catch(() => {});
      }
      await wait(50);

      assert.deepEqual(
        warnings.filter((warning) => warning.name === 'MaxListenersExceededWarning'),
        [],
      );
    });

    it('starts without waiting on a Redis that accepts connections and never answers', async function () {
      proxy.silence({ newConnections: true });
      const stalled = transport(proxied, 100);
      const stalledHandlers = handlers();

      await stalled.transport.subscribe(stalledHandlers);

      sinon.assert.calledOnce(stalledHandlers.onConnectionLost);
      sinon.assert.notCalled(stalledHandlers.onReconnected);

      proxy.answer();
      await eventually(
        () => stalledHandlers.onReconnected.called,
        'It never retried the connection Redis did not answer',
      );

      const peer = transport();
      await peer.transport.subscribe(handlers());
      await peer.transport.publish({ name: 'settings', origin: 'peer' });
      await eventually(() => stalledHandlers.onMessage.called, 'It is not subscribed');
    });

    it('reconnects when Redis answers the connection but never confirms the subscription', async function () {
      proxy.stallOn('subscribe');
      const unconfirmed = transport(proxied, 100);
      const unconfirmedHandlers = handlers();

      await unconfirmed.transport.subscribe(unconfirmedHandlers);
      sinon.assert.calledOnce(unconfirmedHandlers.onConnectionLost);

      proxy.answer();
      await eventually(
        () => unconfirmedHandlers.onReconnected.called,
        'It never retried the subscription Redis did not confirm',
      );

      const peer = transport();
      await peer.transport.subscribe(handlers());
      await peer.transport.publish({ name: 'settings', origin: 'peer' });
      await eventually(() => unconfirmedHandlers.onMessage.called, 'It is not subscribed');
    });

    it('reconnects when its heartbeat stops coming back after the wall clock steps back', async function () {
      const deaf = transport(proxied);
      const deafHandlers = handlers();
      await deaf.transport.subscribe(deafHandlers);
      const realNow = Date.now;
      const stepped = sinon.stub(Date, 'now').callsFake(() => realNow() - 3_600_000);
      closing.push(async () => stepped.restore());

      proxy.silence();

      await eventually(
        () => deafHandlers.onReconnected.called,
        'It did not notice the dead connection',
      );
    });

    it('reconnects when its heartbeat stops coming back on an open connection', async function () {
      const deaf = transport(proxied);
      const deafHandlers = handlers();
      await deaf.transport.subscribe(deafHandlers);

      proxy.silence();
      await eventually(
        () => deafHandlers.onReconnected.called,
        'It did not notice the dead connection',
      );

      sinon.assert.calledOnce(deafHandlers.onConnectionLost);
      sinon.assert.callOrder(deafHandlers.onConnectionLost, deafHandlers.onReconnected);
      sinon.assert.calledWithMatch(deaf.logging.warn, {
        event: { name: 'invalidations.redis.heartbeat.missed' },
      });

      const peer = transport();
      await peer.transport.subscribe(handlers());
      await peer.transport.publish({ name: 'settings', origin: 'peer' });
      await eventually(() => deafHandlers.onMessage.called, 'It is not subscribed again');
    });
  },
);
