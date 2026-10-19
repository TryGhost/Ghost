import assert from 'node:assert/strict';
import sinon from 'sinon';
import { randomUUID } from 'node:crypto';
import { setImmediate as flushEventLoop } from 'node:timers/promises';

import { AutoFillingMap } from '../../../../../core/server/lib/auto-filling-map';
import type {
  InternalApiKey,
  InternalIntegrationSlug,
} from '../../../../../core/server/services/internal-keys';
import { StartAutomationsPollEvent } from '../../../../../core/server/services/automations/events/start-automations-poll-event';
import { AutomationsService } from '../../../../../core/server/services/automations/service';

type InitOptions = Parameters<AutomationsService['init']>[0];
type DomainEvents = InitOptions['domainEvents'];
type SchedulerAdapter = InitOptions['schedulerAdapter'];
type SchedulerAdapterStub = sinon.SinonStubbedInstance<SchedulerAdapter>;

describe('automations service', function () {
  let automations: AutomationsService;
  let domainEvents: DomainEvents;
  let schedulerAdapter: SchedulerAdapterStub;
  let initOptions: InitOptions;

  beforeEach(function () {
    const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
      (slug) => Promise.reject(new Error(`Test internalKeys not seeded for slug ${slug}`)),
    );
    internalKeys.set('ghost-scheduler', Promise.resolve({ id: 'k1', secret: 'aaaa' }));

    automations = new AutomationsService();
    domainEvents = {
      dispatch: sinon.stub(),
      subscribe: sinon.stub(),
    };
    schedulerAdapter = {
      schedule: sinon.stub(),
      register: sinon.stub(),
    };
    initOptions = {
      domainEvents,
      apiUrl: 'https://fake.example.com/ghost/api/admin',
      schedulerAdapter,
      siteUuid: randomUUID(),
      internalKeys,
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('init', function () {
    it('dispatches a StartAutomationsPollEvent', async function () {
      automations.init(initOptions);
      await flushEventLoop();
      sinon.assert.calledWith(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });

    it('subscribes to StartAutomationsPollEvent', function () {
      automations.init(initOptions);
      sinon.assert.called(domainEvents.subscribe);
      sinon.assert.alwaysCalledWith(
        domainEvents.subscribe,
        StartAutomationsPollEvent,
        sinon.match.func,
      );
    });

    it('subscribes each poller only once when init is called multiple times', function () {
      automations.init(initOptions);
      automations.init(initOptions);
      automations.init(initOptions);
      automations.init(initOptions);
      sinon.assert.calledTwice(domainEvents.subscribe);
    });
  });

  describe('enqueueing poll', function () {
    beforeEach(async function () {
      automations.init(initOptions);
      await flushEventLoop();
      domainEvents.dispatch.resetHistory();
    });

    it('dispatches a StartAutomationsPollEvent if date is in the past', async function () {
      const past = new Date(Date.now() - 1000);
      await automations.__testOnlyEnqueuePollAt(past);

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );

      sinon.assert.notCalled(schedulerAdapter.schedule);
    });

    it('dispatches a StartAutomationsPollEvent if date is now', async function () {
      const now = new Date('2026-01-01T00:00:00.000Z');
      sinon.useFakeTimers({ now, toFake: ['Date'] });

      await automations.__testOnlyEnqueuePollAt(now);

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );

      sinon.assert.notCalled(schedulerAdapter.schedule);
    });

    it('schedules an in-memory timer if date is in the future', async function () {
      const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
      const future = new Date(Date.now() + 1000);

      await automations.__testOnlyEnqueuePollAt(future);
      await clock.tickAsync(999);

      sinon.assert.notCalled(domainEvents.dispatch);

      await clock.tickAsync(1);

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });

    it('can schedule a timer for far in the future, avoiding setTimeout limits', async function () {
      const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const future = new Date(Date.now() + thirtyDays);

      await automations.__testOnlyEnqueuePollAt(future);

      await clock.tickAsync(thirtyDays - 1);

      sinon.assert.notCalled(domainEvents.dispatch);

      await clock.tickAsync(1);

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });

    it('cancels future in-memory timers if the date is sooner than the previous date', async function () {
      const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
      const later = new Date(Date.now() + 10_000);
      const sooner = new Date(Date.now() + 5000);

      await automations.__testOnlyEnqueuePollAt(later);
      await automations.__testOnlyEnqueuePollAt(sooner);
      await clock.tickAsync(4999);

      sinon.assert.notCalled(domainEvents.dispatch);

      await clock.tickAsync(1);

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );

      await clock.tickAsync(5000);

      sinon.assert.calledOnce(domainEvents.dispatch);
    });

    it("doesn't cancel future in-memory timers if the date is later than a previous date", async function () {
      const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
      const sooner = new Date(Date.now() + 5000);
      const later = new Date(Date.now() + 10_000);

      await automations.__testOnlyEnqueuePollAt(sooner);
      await automations.__testOnlyEnqueuePollAt(later);
      await clock.tickAsync(4999);

      sinon.assert.notCalled(domainEvents.dispatch);

      await clock.tickAsync(1);

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );

      await clock.tickAsync(5000);

      sinon.assert.calledOnce(domainEvents.dispatch);
    });

    it('reaches out to the scheduler for dates in the future', async function () {
      const future = new Date(Date.now() + 10_000);
      await automations.__testOnlyEnqueuePollAt(future);

      sinon.assert.calledOnceWithExactly(
        schedulerAdapter.schedule,
        sinon.match({
          time: sinon.match(
            (value) => value >= future.getTime() && value < future.getTime() + 15 * 60 * 1000,
          ),
          url: sinon.match(
            (value) => typeof value === 'string' && new URL(value).searchParams.has('token'),
          ),
          extra: {
            httpMethod: 'PUT',
            idempotencyKey: sinon.match.string,
          },
        }),
      );

      sinon.assert.neverCalledWith(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });

    it('uses the same idempotency key when requesting the same time', async function () {
      const future = new Date(Date.now() + 10_000);

      await automations.__testOnlyEnqueuePollAt(future);
      await automations.__testOnlyEnqueuePollAt(future);
      await automations.__testOnlyEnqueuePollAt(future);

      sinon.assert.calledThrice(schedulerAdapter.schedule);

      const idempotencyKeys = schedulerAdapter.schedule
        .getCalls()
        .map((call) => call.args[0].extra.idempotencyKey);
      assert.equal(new Set(idempotencyKeys).size, 1);
    });
  });

  describe('rescheduleAll', function () {
    it('dispatches a fresh StartAutomationsPollEvent', async function () {
      automations.init(initOptions);
      await flushEventLoop();
      domainEvents.dispatch.resetHistory();

      await automations.rescheduleAll();

      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });

    it('is a no-op before init', async function () {
      await automations.rescheduleAll();
      sinon.assert.notCalled(domainEvents.dispatch);
    });
  });
});
