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
import * as automationsApi from '../../../../../core/server/services/automations/automations-api';
import { LabelAddedToMembersEvent } from '../../../../../core/shared/events/label-added-to-members-event';
import { AutomationsService } from '../../../../../core/server/services/automations/service';
import { MAX_CACHED_SCHEDULER_POLL_TIMES } from '../../../../../core/server/services/automations/constants';
import { getSchedulerPollTime } from '../../../../../core/server/services/automations/scheduler-poll-time';

vi.mock(
  '../../../../../core/server/services/automations/automations-api',
  async (importOriginal) => ({
    ...(await importOriginal<typeof automationsApi>()),
    notify: vi.fn(),
  }),
);

type InitOptions = Parameters<AutomationsService['init']>[0];
type DomainEvents = InitOptions['domainEvents'];
type DomainEventsStub = sinon.SinonStubbedInstance<DomainEvents>;
type SchedulerAdapter = InitOptions['schedulerAdapter'];
type SchedulerAdapterStub = sinon.SinonStubbedInstance<SchedulerAdapter>;

describe('automations service', function () {
  let automations: AutomationsService;
  let domainEvents: DomainEventsStub;
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
    vi.resetAllMocks();
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
      sinon.assert.calledWith(domainEvents.subscribe, StartAutomationsPollEvent, sinon.match.func);
    });

    it('subscribes to LabelAddedToMembersEvent', function () {
      automations.init(initOptions);
      sinon.assert.called(domainEvents.subscribe);
      sinon.assert.calledWith(domainEvents.subscribe, LabelAddedToMembersEvent, sinon.match.func);
    });

    it('subscribes each poller only once when init is called multiple times', function () {
      automations.init(initOptions);
      sinon.assert.calledThrice(domainEvents.subscribe);

      automations.init(initOptions);
      automations.init(initOptions);
      automations.init(initOptions);
      automations.init(initOptions);
      sinon.assert.calledThrice(domainEvents.subscribe);
    });
  });

  describe('label additions', function () {
    it('notifies automations with the label and members', async function () {
      const notify = vi.mocked(automationsApi.notify).mockResolvedValue(undefined);
      automations.init(initOptions);
      const subscription = domainEvents.subscribe
        .getCalls()
        .find((call: sinon.SinonSpyCall) => call.args[0] === LabelAddedToMembersEvent);
      assert.ok(subscription);

      const event = new LabelAddedToMembersEvent('label', ['member-1', 'member-2']);
      await subscription.args[1](event);

      expect(notify).toHaveBeenCalledExactlyOnceWith({ eventName: 'label_added', ...event.data });
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

    it('de-duplicates successful scheduler calls for the same slot', async function () {
      sinon.useFakeTimers({ now: new Date('2026-01-01') });
      assert(typeof initOptions.siteUuid === 'string');
      const slot = getSchedulerPollTime(new Date(Date.now() + 60_000), initOptions.siteUuid);

      await automations.__testOnlyEnqueuePollAt(slot);
      await automations.__testOnlyEnqueuePollAt(new Date(slot.getTime() - 1));

      sinon.assert.calledOnce(schedulerAdapter.schedule);
    });

    it("doesn't de-duplicate scheduler calls for different slots", async function () {
      sinon.useFakeTimers({ now: new Date('2026-01-01') });
      const first = Date.now() + 60_000;

      await automations.__testOnlyEnqueuePollAt(new Date(first));
      await automations.__testOnlyEnqueuePollAt(new Date(first + 15 * 60 * 1000));

      sinon.assert.calledTwice(schedulerAdapter.schedule);
    });

    it('schedules an in-memory poll even when it skips the scheduler call', async function () {
      const clock = sinon.useFakeTimers({ now: new Date('2026-01-01') });
      assert(typeof initOptions.siteUuid === 'string');
      const slot = getSchedulerPollTime(new Date(Date.now() + 60_000), initOptions.siteUuid);
      const earlier = new Date(slot.getTime() - 1);

      await automations.__testOnlyEnqueuePollAt(earlier);
      await clock.tickAsync(earlier.getTime() - Date.now());
      domainEvents.dispatch.resetHistory();
      schedulerAdapter.schedule.resetHistory();

      await automations.__testOnlyEnqueuePollAt(slot);
      sinon.assert.notCalled(schedulerAdapter.schedule);
      sinon.assert.notCalled(domainEvents.dispatch);

      await clock.tickAsync(slot.getTime() - Date.now());
      sinon.assert.calledOnceWithExactly(
        domainEvents.dispatch,
        sinon.match.instanceOf(StartAutomationsPollEvent),
      );
    });

    it("doesn't de-duplicate failed scheduler calls", async function () {
      sinon.useFakeTimers({ now: new Date('2026-01-01') });
      const future = new Date(Date.now() + 10_000);
      schedulerAdapter.schedule.onFirstCall().rejects(new Error('Scheduler unavailable'));

      await automations.__testOnlyEnqueuePollAt(future);
      await automations.__testOnlyEnqueuePollAt(future);

      sinon.assert.calledTwice(schedulerAdapter.schedule);
      assert.equal(
        schedulerAdapter.schedule.firstCall.args[0].extra.idempotencyKey,
        schedulerAdapter.schedule.secondCall.args[0].extra.idempotencyKey,
      );
    });

    it("doesn't de-duplicate pending scheduler calls", async function () {
      sinon.useFakeTimers({
        now: new Date('2026-01-01'),
        toFake: ['Date', 'setTimeout', 'clearTimeout'],
      });
      const future = new Date(Date.now() + 10_000);
      const first = Promise.withResolvers<void>();
      schedulerAdapter.schedule.onFirstCall().returns(first.promise);

      const pending = automations.__testOnlyEnqueuePollAt(future);
      await flushEventLoop();
      sinon.assert.calledOnce(schedulerAdapter.schedule);
      await automations.__testOnlyEnqueuePollAt(future);
      sinon.assert.calledTwice(schedulerAdapter.schedule);

      first.resolve();
      await pending;
    });

    it('contacts the scheduler again for the first poll time after scheduling too many distinct times', async function () {
      sinon.useFakeTimers({ now: new Date('2026-01-01') });
      const interval = 15 * 60 * 1000;
      const first = new Date(Date.now() + interval);
      const second = new Date(first.getTime() + interval);

      for (let i = 0; i <= MAX_CACHED_SCHEDULER_POLL_TIMES; i++) {
        await automations.__testOnlyEnqueuePollAt(new Date(first.getTime() + i * interval));
      }
      assert.equal(schedulerAdapter.schedule.callCount, MAX_CACHED_SCHEDULER_POLL_TIMES + 1);

      schedulerAdapter.schedule.resetHistory();
      await automations.__testOnlyEnqueuePollAt(second);
      sinon.assert.notCalled(schedulerAdapter.schedule);
      await automations.__testOnlyEnqueuePollAt(first);
      sinon.assert.calledOnce(schedulerAdapter.schedule);
    });

    it('still skips duplicate scheduler calls when older slots expire', async function () {
      const clock = sinon.useFakeTimers({ now: new Date('2026-01-01') });
      const interval = 15 * 60 * 1000;
      const distant = new Date(Date.now() + (MAX_CACHED_SCHEDULER_POLL_TIMES + 2) * interval);
      await automations.__testOnlyEnqueuePollAt(distant);

      for (let i = 1; i < MAX_CACHED_SCHEDULER_POLL_TIMES; i++) {
        await automations.__testOnlyEnqueuePollAt(new Date(Date.now() + i * interval));
      }
      clock.setSystemTime(distant.getTime() - interval);
      await automations.__testOnlyEnqueuePollAt(new Date(distant.getTime() + interval));

      schedulerAdapter.schedule.resetHistory();
      await automations.__testOnlyEnqueuePollAt(distant);
      sinon.assert.notCalled(schedulerAdapter.schedule);
    });

    it('contacts the scheduler again for the same time after rescheduling', async function () {
      sinon.useFakeTimers({
        now: new Date('2026-01-01'),
        toFake: ['Date', 'setTimeout', 'clearTimeout'],
      });
      const future = new Date(Date.now() + 10_000);

      await automations.__testOnlyEnqueuePollAt(future);
      await automations.rescheduleAll();
      await automations.__testOnlyEnqueuePollAt(future);

      sinon.assert.calledTwice(schedulerAdapter.schedule);
    });

    it('discards the result of a scheduler call if the key rotates before it completes', async function () {
      sinon.useFakeTimers({
        now: new Date('2026-01-01'),
        toFake: ['Date', 'setTimeout', 'clearTimeout'],
      });
      const future = new Date(Date.now() + 10_000);
      const previous = Promise.withResolvers<void>();
      schedulerAdapter.schedule.onFirstCall().returns(previous.promise);

      const pending = automations.__testOnlyEnqueuePollAt(future);
      await flushEventLoop();
      sinon.assert.calledOnce(schedulerAdapter.schedule);
      initOptions.internalKeys.set(
        'ghost-scheduler',
        Promise.resolve({ id: 'k2', secret: 'bbbb' }),
      );
      await automations.rescheduleAll();
      previous.resolve();
      await pending;

      await automations.__testOnlyEnqueuePollAt(future);
      sinon.assert.calledTwice(schedulerAdapter.schedule);
      assert.equal(
        schedulerAdapter.schedule.firstCall.args[0].time,
        schedulerAdapter.schedule.secondCall.args[0].time,
      );
      assert.notEqual(
        schedulerAdapter.schedule.firstCall.args[0].extra.idempotencyKey,
        schedulerAdapter.schedule.secondCall.args[0].extra.idempotencyKey,
      );
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
