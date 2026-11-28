import assert from 'node:assert/strict';
import sinon from 'sinon';
import { IncorrectUsageError, InternalServerError } from '@tryghost/errors';
import { InvalidationsService } from '../../../../../core/server/services/invalidations/invalidations-service';
import type { InvalidationMessage } from '../../../../../core/server/services/invalidations/transport';
import { createLoggingFake } from '../../../../utils/logging-utils';
import { FakeTransport } from './fake-transport';

const OWN_ID = 'instance-a';
const PEER_ID = 'instance-b';
const SENT_AT = 1_700_000_000_000;
const CACHE_NAMES = ['settings', 'other', 'failing', 'healthy', 'after', 'reset', 'message'];

describe('InvalidationsService', function () {
  let transport: FakeTransport;
  let logging: ReturnType<typeof createLoggingFake>;
  let now: sinon.SinonStub<[], number>;
  let wallClock: sinon.SinonStub<[], number>;
  let registry: InvalidationsService;

  beforeEach(async function () {
    transport = new FakeTransport();
    logging = createLoggingFake();
    now = sinon.stub<[], number>().returns(0);
    wallClock = sinon.stub<[], number>().returns(SENT_AT);
    registry = new InvalidationsService({
      transport,
      instanceId: OWN_ID,
      logging,
      now,
      wallClock,
      cacheNames: CACHE_NAMES,
    });
    await registry.start();
  });

  // A failed callback sets a real retry timer
  afterEach(async function () {
    await registry.stop();
  });

  describe('receiving', function () {
    it('runs the callback registered for a peer message and logs how late it arrived and how long it took', async function () {
      const settings = sinon.stub().resolves();
      const other = sinon.stub();
      registry.register('settings', settings);
      registry.register('other', other);
      now.onFirstCall().returns(100).onSecondCall().returns(112.5);
      wallClock.returns(SENT_AT + 40);

      await transport.subscribed.onMessage({
        name: 'settings',
        origin: PEER_ID,
        sentAt: SENT_AT,
      });

      sinon.assert.calledOnce(settings);
      sinon.assert.notCalled(other);
      sinon.assert.calledWithMatch(logging.info, {
        event: { name: 'invalidations.received', duration: 12_500_000, outcome: 'success' },
        invalidation: { name: 'settings', origin: PEER_ID, deliveryLatencyMs: 40 },
      });
    });

    it('still invalidates a message without a send time, logging no delivery latency', async function () {
      const settings = sinon.stub().resolves();
      registry.register('settings', settings);

      await transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });

      sinon.assert.calledOnce(settings);
      sinon.assert.calledWithMatch(logging.info, {
        event: { name: 'invalidations.received' },
        invalidation: { name: 'settings', origin: PEER_ID },
      });
      const [fields] = logging.info.lastCall.args as [{ invalidation: object }];
      assert.equal('deliveryLatencyMs' in fields.invalidation, false);
    });

    it('ignores its own messages', async function () {
      const settings = sinon.stub();
      registry.register('settings', settings);

      await transport.subscribed.onMessage({ name: 'settings', origin: OWN_ID });

      sinon.assert.notCalled(settings);
    });

    it('warns about a message for a name nothing registered', async function () {
      const settings = sinon.stub();
      registry.register('settings', settings);

      wallClock.returns(SENT_AT + 40);

      await transport.subscribed.onMessage({ name: 'unknown', origin: PEER_ID, sentAt: SENT_AT });

      sinon.assert.notCalled(settings);
      sinon.assert.calledWithMatch(logging.warn, {
        event: { name: 'invalidations.unknown' },
        invalidation: { name: 'unknown', origin: PEER_ID, deliveryLatencyMs: 40 },
      });
    });

    it('runs a callback once when its name registers after a peer named it', async function () {
      await transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });
      await transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });
      const settings = sinon.stub().resolves();

      registry.register('settings', settings);
      await Promise.resolve();
      registry.register('settings', settings);

      sinon.assert.calledOnce(settings);
    });

    it('logs a failing callback instead of letting it escape', async function () {
      const failure = new Error('reload failed');
      registry.register('settings', sinon.stub().rejects(failure));

      await transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });

      sinon.assert.calledWithMatch(logging.error, {
        event: { name: 'invalidations.handler.failed' },
        invalidation: { name: 'settings' },
        err: failure,
      });
    });

    it('logs how late a message arrived and who sent it when its callback fails', async function () {
      registry.register('settings', sinon.stub().rejects(new Error('reload failed')));
      wallClock.returns(SENT_AT + 900);

      await transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID, sentAt: SENT_AT });

      sinon.assert.calledWithMatch(logging.info, {
        event: { name: 'invalidations.received', outcome: 'failure' },
        invalidation: { name: 'settings', origin: PEER_ID, deliveryLatencyMs: 900 },
      });
    });

    it('runs one callback at a time per name and reruns once for messages that arrive meanwhile', async function () {
      const first = Promise.withResolvers<void>();
      let active = 0;
      let maxActive = 0;
      const settings = sinon.stub().callsFake(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        if (settings.callCount === 1) {
          await first.promise;
        }
        active -= 1;
      });
      registry.register('settings', settings);

      const received = [
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
      ];
      sinon.assert.calledOnce(settings);

      first.resolve();
      await Promise.all(received);

      sinon.assert.calledTwice(settings);
      assert.equal(maxActive, 1);
    });

    it('reruns a callback that was running when this instance notified peers', async function () {
      const first = Promise.withResolvers<void>();
      const settings = sinon.stub().onFirstCall().returns(first.promise);
      const handle = registry.register('settings', settings);

      const received = transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });
      await handle.notifyPeers();
      sinon.assert.calledOnce(settings);

      first.resolve();
      await received;
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      sinon.assert.calledTwice(settings);
    });

    it('runs the latest callback when a name is registered again', async function () {
      const first = sinon.stub();
      const second = sinon.stub();
      registry.register('settings', first);
      registry.register('settings', second);

      await transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });

      sinon.assert.notCalled(first);
      sinon.assert.calledOnce(second);
    });
  });

  describe('connection', function () {
    it('is ready until the connection is lost', function () {
      assert.equal(registry.isReady(), true);

      transport.subscribed.onConnectionLost();

      assert.equal(registry.isReady(), false);
      sinon.assert.calledWithMatch(logging.warn, {
        event: { name: 'invalidations.connection.lost' },
      });
    });

    it('reruns every callback on reconnect before becoming ready again', async function () {
      const settings = Promise.withResolvers<void>();
      const settingsCallback = sinon.stub().returns(settings.promise);
      const otherCallback = sinon.stub();
      registry.register('settings', settingsCallback);
      registry.register('other', otherCallback);
      transport.subscribed.onConnectionLost();

      const reset = transport.subscribed.onReconnected();

      sinon.assert.calledOnce(settingsCallback);
      sinon.assert.calledOnce(otherCallback);
      assert.equal(registry.isReady(), false);
      settings.resolve();
      await reset;
      assert.equal(registry.isReady(), true);
      sinon.assert.calledWithMatch(logging.info, {
        event: { name: 'invalidations.reset.started' },
      });
      sinon.assert.calledWithMatch(logging.info, {
        event: { name: 'invalidations.reset.finished' },
        invalidation: { count: 2 },
      });
    });

    it('runs a callback once when its name registers after a reset, as it may have missed a message', async function () {
      transport.subscribed.onConnectionLost();
      await transport.subscribed.onReconnected();
      const settings = sinon.stub();

      registry.register('settings', settings);
      registry.register('settings', settings);

      sinon.assert.calledOnce(settings);
    });

    it('stays not ready when the connection is lost again while a reset runs', async function () {
      const settings = Promise.withResolvers<void>();
      registry.register('settings', sinon.stub().returns(settings.promise));
      transport.subscribed.onConnectionLost();

      const reset = transport.subscribed.onReconnected();
      transport.subscribed.onConnectionLost();
      settings.resolve();
      await reset;

      assert.equal(registry.isReady(), false);
    });

    it('stays not ready when a peer message reruns a callback the reset ran and the rerun fails', async function () {
      const settingsFirst = Promise.withResolvers<void>();
      const settings = sinon.stub();
      settings.onFirstCall().returns(settingsFirst.promise);
      settings.onSecondCall().rejects(new Error('reload failed'));
      const other = Promise.withResolvers<void>();
      registry.register('settings', settings);
      registry.register('other', sinon.stub().returns(other.promise));
      transport.subscribed.onConnectionLost();
      const reset = transport.subscribed.onReconnected();
      const received = transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });

      settingsFirst.resolve();
      await received;
      other.resolve();
      await reset;

      sinon.assert.calledTwice(settings);
      assert.equal(registry.isReady(), false);
    });

    it('runs the other callbacks and stays not ready when one fails during a reset', async function () {
      const failure = new Error('reload failed');
      const after = sinon.stub();
      registry.register('failing', sinon.stub().throws(failure));
      registry.register('after', after);
      transport.subscribed.onConnectionLost();

      await transport.subscribed.onReconnected();

      sinon.assert.calledOnce(after);
      assert.equal(registry.isReady(), false);
      sinon.assert.calledWithMatch(logging.error, {
        event: { name: 'invalidations.handler.failed' },
        invalidation: { name: 'failing' },
        err: failure,
      });
      sinon.assert.calledWithMatch(logging.error, {
        event: { name: 'invalidations.reset.failed' },
        invalidation: { count: 2, failed: ['failing'] },
      });
    });

    describe('retrying a failed reset', function () {
      const RETRY_DELAY_MS = 1000;
      let clock: sinon.SinonFakeTimers;
      let retrying: InvalidationsService;
      let retryingTransport: FakeTransport;

      beforeEach(async function () {
        clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        retryingTransport = new FakeTransport();
        retrying = new InvalidationsService({
          transport: retryingTransport,
          instanceId: OWN_ID,
          logging,
          retryDelayMs: RETRY_DELAY_MS,
          cacheNames: CACHE_NAMES,
        });
        await retrying.start();
      });

      afterEach(function () {
        clock.restore();
      });

      it('reruns only the failed callbacks after the delay until they succeed, then is ready', async function () {
        const failing = sinon.stub().rejects(new Error('reload failed'));
        failing.onThirdCall().resolves();
        const healthy = sinon.stub();
        retrying.register('failing', failing);
        retrying.register('healthy', healthy);
        retryingTransport.subscribed.onConnectionLost();
        await retryingTransport.subscribed.onReconnected();

        await clock.tickAsync(RETRY_DELAY_MS - 1);
        sinon.assert.calledOnce(failing);
        await clock.tickAsync(1);
        sinon.assert.calledTwice(failing);
        assert.equal(retrying.isReady(), false);

        await clock.tickAsync(RETRY_DELAY_MS);
        sinon.assert.calledThrice(failing);
        sinon.assert.calledOnce(healthy);
        assert.equal(retrying.isReady(), true);
        sinon.assert.calledWithMatch(logging.info, {
          event: { name: 'invalidations.reset.finished' },
          invalidation: { count: 1 },
        });

        await clock.tickAsync(RETRY_DELAY_MS * 5);
        sinon.assert.calledThrice(failing);
      });

      it('is not ready after a peer message fails to invalidate, until a retry succeeds', async function () {
        const failing = sinon.stub().rejects(new Error('reload failed'));
        failing.onSecondCall().resolves();
        retrying.register('failing', failing);

        await retryingTransport.subscribed.onMessage({ name: 'failing', origin: PEER_ID });
        assert.equal(retrying.isReady(), false);

        await clock.tickAsync(RETRY_DELAY_MS);
        sinon.assert.calledTwice(failing);
        assert.equal(retrying.isReady(), true);
      });

      it('is not ready after the callback run on registering, for a message sent before, fails, until a retry succeeds', async function () {
        await retryingTransport.subscribed.onMessage({ name: 'failing', origin: PEER_ID });
        const failing = sinon.stub().rejects(new Error('reload failed'));
        failing.onSecondCall().resolves();

        retrying.register('failing', failing);
        await clock.tickAsync(0);
        assert.equal(retrying.isReady(), false);

        await clock.tickAsync(RETRY_DELAY_MS);
        sinon.assert.calledTwice(failing);
        assert.equal(retrying.isReady(), true);
      });

      it('is not ready after the rerun asked for by notifying peers fails, until a retry succeeds', async function () {
        const running = Promise.withResolvers<void>();
        const failing = sinon.stub();
        failing.onFirstCall().returns(running.promise);
        failing.onSecondCall().rejects(new Error('reload failed'));
        failing.onThirdCall().resolves();
        const handle = retrying.register('failing', failing);
        const received = retryingTransport.subscribed.onMessage({
          name: 'failing',
          origin: PEER_ID,
        });

        void handle.notifyPeers();
        running.resolve();
        await received;
        await clock.tickAsync(0);
        sinon.assert.calledTwice(failing);
        assert.equal(retrying.isReady(), false);

        await clock.tickAsync(RETRY_DELAY_MS);
        sinon.assert.calledThrice(failing);
        assert.equal(retrying.isReady(), true);
      });

      it('retries a name that failed for a peer message along with those failing a reset', async function () {
        const fromReset = sinon.stub().rejects(new Error('reload failed'));
        fromReset.onSecondCall().resolves();
        const fromMessage = sinon.stub().resolves();
        fromMessage.onSecondCall().rejects(new Error('reload failed'));
        retrying.register('reset', fromReset);
        retrying.register('message', fromMessage);
        retryingTransport.subscribed.onConnectionLost();
        await retryingTransport.subscribed.onReconnected();

        await retryingTransport.subscribed.onMessage({ name: 'message', origin: PEER_ID });
        await clock.tickAsync(RETRY_DELAY_MS);

        sinon.assert.calledThrice(fromMessage);
        assert.equal(retrying.isReady(), true);
      });

      it('gives up the retry when the connection is lost again', async function () {
        const failing = sinon.stub().rejects(new Error('reload failed'));
        retrying.register('failing', failing);
        retryingTransport.subscribed.onConnectionLost();
        await retryingTransport.subscribed.onReconnected();

        retryingTransport.subscribed.onConnectionLost();
        await clock.tickAsync(RETRY_DELAY_MS * 5);

        sinon.assert.calledOnce(failing);
        assert.equal(retrying.isReady(), false);
      });

      it('gives up the retry on stop', async function () {
        const failing = sinon.stub().rejects(new Error('reload failed'));
        retrying.register('failing', failing);
        retryingTransport.subscribed.onConnectionLost();
        await retryingTransport.subscribed.onReconnected();

        await retrying.stop();
        await clock.tickAsync(RETRY_DELAY_MS * 5);

        sinon.assert.calledOnce(failing);
      });

      it('gives up the retry when a stop comes while the reset runs', async function () {
        const reload = Promise.withResolvers<void>();
        const failing = sinon.stub().returns(reload.promise);
        retrying.register('failing', failing);
        retryingTransport.subscribed.onConnectionLost();
        const reset = retryingTransport.subscribed.onReconnected();

        await retrying.stop();
        reload.reject(new Error('reload failed'));
        await reset;
        await clock.tickAsync(RETRY_DELAY_MS * 5);

        sinon.assert.calledOnce(failing);
      });

      it('sets no retry when a callback for a peer message fails after a stop', async function () {
        const reload = Promise.withResolvers<void>();
        const failing = sinon.stub().returns(reload.promise);
        retrying.register('failing', failing);
        const received = retryingTransport.subscribed.onMessage({
          name: 'failing',
          origin: PEER_ID,
        });

        await retrying.stop();
        reload.reject(new Error('reload failed'));
        await received;
        await clock.tickAsync(RETRY_DELAY_MS * 5);

        sinon.assert.calledOnce(failing);
      });
    });
  });

  describe('notifying peers', function () {
    it('publishes the name, its own instance id and when it sent the message', async function () {
      const handle = registry.register('settings', sinon.stub());

      await handle.notifyPeers();

      sinon.assert.calledOnceWithExactly(transport.publish, {
        name: 'settings',
        origin: OWN_ID,
        sentAt: SENT_AT,
      });
    });

    it('publishes once for the notifications made in one turn', async function () {
      const settings = registry.register('settings', sinon.stub());
      const other = registry.register('other', sinon.stub());

      await Promise.all([settings.notifyPeers(), settings.notifyPeers(), other.notifyPeers()]);
      await settings.notifyPeers();

      sinon.assert.calledThrice(transport.publish);
      sinon.assert.calledWithExactly(transport.publish.firstCall, {
        name: 'settings',
        origin: OWN_ID,
        sentAt: SENT_AT,
      });
      sinon.assert.calledWithExactly(transport.publish.secondCall, {
        name: 'other',
        origin: OWN_ID,
        sentAt: SENT_AT,
      });
    });

    it('reruns a running callback as soon as it notifies peers, before the message goes out', async function () {
      const first = Promise.withResolvers<void>();
      const settings = sinon.stub().onFirstCall().returns(first.promise);
      const handle = registry.register('settings', settings);
      const received = transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });

      const notified = handle.notifyPeers();
      first.resolve();
      await received;
      await notified;

      sinon.assert.calledTwice(settings);
    });

    it('logs a failed publish without rejecting', async function () {
      const failure = new Error('connection is closed');
      transport.publish.rejects(failure);
      const handle = registry.register('settings', sinon.stub());

      await handle.notifyPeers();

      sinon.assert.calledWithMatch(logging.error, {
        event: { name: 'invalidations.publish.failed' },
        invalidation: { name: 'settings' },
        err: failure,
      });
    });
  });

  describe('reloading its own cache', function () {
    it('runs the callback after the one running for a peer, and tells no peer', async function () {
      const first = Promise.withResolvers<void>();
      const settings = sinon.stub().onFirstCall().returns(first.promise);
      const handle = registry.register('settings', settings);
      const received = transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID });

      const reloaded = handle.reload();
      sinon.assert.calledOnce(settings);
      first.resolve();
      await Promise.all([received, reloaded]);
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      sinon.assert.calledTwice(settings);
      sinon.assert.notCalled(transport.publish);
    });

    it('rejects and is not ready when the reload fails', async function () {
      const handle = registry.register(
        'settings',
        sinon.stub().rejects(new Error('reload failed')),
      );

      await assert.rejects(handle.reload(), InternalServerError);

      assert.equal(registry.isReady(), false);
    });
  });

  describe('dedicated to invalidations', function () {
    it('gives the callback nothing from a reload, whatever it is given', async function () {
      const settings = sinon.stub();
      const handle = registry.register('settings', settings);

      // @ts-expect-error A reload has nothing to pass on
      await handle.reload({ value: 'secret' });

      sinon.assert.calledOnceWithExactly(settings);
    });

    it('sends only the name, its own id and the time, whatever notifyPeers is given', async function () {
      const handle = registry.register('settings', sinon.stub());

      // @ts-expect-error A notification has nothing to send but the name
      await handle.notifyPeers({ value: 'secret' });

      sinon.assert.calledOnceWithExactly(transport.publish, {
        name: 'settings',
        origin: OWN_ID,
        sentAt: SENT_AT,
      });
    });

    it('gives the callback nothing from the message', async function () {
      const settings = sinon.stub();
      registry.register('settings', settings);

      await transport.subscribed.onMessage({
        name: 'settings',
        origin: PEER_ID,
        sentAt: SENT_AT,
        value: 'secret',
      } as InvalidationMessage);

      sinon.assert.calledOnceWithExactly(settings);
    });

    it('offers no transport to publish anything else through', function () {
      // @ts-expect-error Only a registered handle sends, and only its name
      assert.equal(registry.transport, undefined);
    });

    it('accepts only the caches it was built for, so a key or value cannot ride along in a name', function () {
      for (const name of ['', 'unknown', 'settings-on', 'settings:abc123', '{"tier":"gold"}']) {
        assert.throws(() => registry.register(name, sinon.stub()), IncorrectUsageError, name);
      }
      for (const name of CACHE_NAMES) {
        registry.register(name, sinon.stub());
      }
    });

    it('is built for tiers alone unless told otherwise', function () {
      const service = new InvalidationsService({ transport, instanceId: OWN_ID, logging });

      service.register('tiers', sinon.stub());
      assert.throws(() => service.register('settings', sinon.stub()), IncorrectUsageError);
    });
  });

  describe('lifecycle', function () {
    it('subscribes on start and closes the transport on stop', async function () {
      const fresh = new FakeTransport();
      const service = new InvalidationsService({ transport: fresh, instanceId: OWN_ID, logging });
      assert.equal(fresh.handlers, undefined);

      await service.start();
      assert.ok(fresh.handlers);
      sinon.assert.notCalled(fresh.close);

      await service.stop();
      sinon.assert.calledOnce(fresh.close);
    });

    it('reruns every callback and is ready when it starts again after stopping while not ready', async function () {
      const settings = sinon.stub();
      registry.register('settings', settings);
      transport.subscribed.onConnectionLost();
      await registry.stop();

      await registry.start();

      sinon.assert.calledOnce(settings);
      assert.equal(registry.isReady(), true);
    });

    it('starts no rerun queued before a stop', async function () {
      const first = Promise.withResolvers<void>();
      const settings = sinon.stub().onFirstCall().returns(first.promise);
      registry.register('settings', settings);
      const received = [
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
      ];

      await registry.stop();
      first.resolve();
      await Promise.all(received);

      sinon.assert.calledOnce(settings);
    });

    it('is ready after starting again while a callback queued before the stop still ran', async function () {
      const first = Promise.withResolvers<void>();
      const settings = sinon.stub().onFirstCall().returns(first.promise);
      registry.register('settings', settings);
      const received = [
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
        transport.subscribed.onMessage({ name: 'settings', origin: PEER_ID }),
      ];
      await registry.stop();

      const started = registry.start();
      first.resolve();
      await Promise.all([started, ...received]);

      sinon.assert.calledTwice(settings);
      assert.equal(registry.isReady(), true);
    });

    it('is not ready once stopped, and reruns every callback when it starts again', async function () {
      const settings = sinon.stub();
      registry.register('settings', settings);

      await registry.stop();
      assert.equal(registry.isReady(), false);
      await registry.start();

      sinon.assert.calledOnce(settings);
      assert.equal(registry.isReady(), true);
    });
  });
});
