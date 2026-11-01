import assert from 'node:assert/strict';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { mockSystemTime } from '../../../../utils/clock-utils';
import { createLoggingFake } from '../../../../utils/logging-utils';

const models = require('../../../../../core/server/models');
const events = require('../../../../../core/server/lib/common/events');
const { getSignedAdminToken } = require('../../../../../core/server/adapters/scheduling/utils');
const {
  buildSignedJob,
} = require('../../../../../core/server/adapters/scheduling/build-signed-job');
const {
  getSchedulerIdempotencyKey,
} = require('../../../../../core/server/adapters/scheduling/get-scheduler-idempotency-key');
const PostScheduling =
  require('../../../../../core/server/services/post-scheduling/post-scheduling').default;

const API_URL = 'https://site.example/ghost/api/admin/';
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
const KEY = { id: 'scheduler-key-id', secret: 'aaaabbbbccccdddd' };
const EVENTS = [
  'post.scheduled',
  'post.rescheduled',
  'post.unscheduled',
  'page.scheduled',
  'page.rescheduled',
  'page.unscheduled',
] as const;
type EventName = (typeof EVENTS)[number];

type Attributes = Record<string, unknown>;

function fakeModel(attributes: Attributes, previous: Attributes = {}) {
  return {
    get: (name: string) => attributes[name],
    previous: (name: string) => previous[name],
  };
}

function fakeAdapter(overrides: Record<string, unknown> = {}) {
  return {
    schedule: sinon.stub(),
    unschedule: sinon.stub(),
    register: sinon.stub(),
    ...overrides,
  };
}

function fakeKeys(...keys: Array<typeof KEY>) {
  const get = sinon.stub();
  keys.forEach((key, index) => get.onCall(index).resolves(key));
  get.resolves(keys.at(-1));
  return { get };
}

// An oracle built from the helpers the scheduler is expected to delegate to,
// so the assertions pin the whole payload rather than individual fields.
function expectedJob({
  resource,
  id,
  time,
  oldTime,
  key = KEY,
}: {
  resource: 'posts' | 'pages';
  id: string;
  time: number;
  oldTime: number | null;
  key?: typeof KEY;
}) {
  const url = new URL(`${API_URL}schedules/${resource}/${id}/`);
  url.searchParams.set(
    'token',
    getSignedAdminToken({ publishedAt: new Date(time).toISOString(), apiUrl: API_URL, key }),
  );
  return {
    time,
    url: url.toString(),
    extra: {
      httpMethod: 'PUT',
      oldTime,
      idempotencyKey: getSchedulerIdempotencyKey({
        namespace: 'post-scheduling',
        date: new Date(time),
        url,
      }),
    },
  };
}

describe('PostScheduling jobs', function () {
  const sandbox = sinon.createSandbox();
  let added: Array<[string, (...args: unknown[]) => unknown]> = [];
  let logging: ReturnType<typeof createLoggingFake>;

  // The class subscribes on Ghost's shared event bus. Track what each
  // construction adds so the handlers can be awaited directly and removed.
  function construct({
    adapter = fakeAdapter(),
    internalKeys = fakeKeys(KEY),
  }: {
    adapter?: ReturnType<typeof fakeAdapter>;
    internalKeys?: { get: sinon.SinonStub };
  } = {}) {
    const before = new Map<string, unknown[]>(
      events.eventNames().map((name: string) => [name, events.listeners(name)]),
    );
    let service: InstanceType<typeof PostScheduling> | undefined;
    let error: unknown;
    try {
      service = new PostScheduling({
        apiUrl: API_URL,
        adapter,
        internalKeys,
        models,
        events,
        logging,
        buildSignedJob,
        getSchedulerIdempotencyKey,
      });
    } catch (err) {
      error = err;
    }
    const handlers: Partial<Record<string, Array<(model: unknown) => Promise<void>>>> = {};
    for (const name of events.eventNames() as string[]) {
      const previous = before.get(name) ?? [];
      const fresh = events
        .listeners(name)
        .filter((listener: never) => !previous.includes(listener));
      if (fresh.length) {
        handlers[name] = fresh;
        fresh.forEach((listener: never) => added.push([name, listener]));
      }
    }
    return { service, handlers, adapter, internalKeys, error };
  }

  function constructed(options: Parameters<typeof construct>[0] = {}) {
    const result = construct(options);
    assert.ok(result.service, 'construction must succeed');
    return { ...result, service: result.service };
  }

  function handler(handlers: ReturnType<typeof construct>['handlers'], name: EventName) {
    const list = handlers[name] ?? [];
    assert.equal(list.length, 1, `${name} must have exactly one listener`);
    return list[0];
  }

  beforeEach(function () {
    mockSystemTime(NOW);
    logging = createLoggingFake();
  });

  afterEach(function () {
    for (const [name, listener] of added) {
      events.removeListener(name, listener);
    }
    added = [];
    sandbox.restore();
    sinon.restore();
  });

  describe('construction', function () {
    it('subscribes exactly one listener to each scheduling event and registers with the adapter', function () {
      const { service, handlers, adapter } = construct();

      assert.deepEqual(Object.keys(handlers).sort(), [...EVENTS].sort());
      for (const name of EVENTS) {
        handler(handlers, name);
      }
      sinon.assert.calledOnceWithExactly(adapter.register, service);
    });

    it('registers with the adapter only after subscribing, and keeps the listeners when registration throws', function () {
      // The class leaves its listeners subscribed when registration fails;
      // the root removes them before its init rejects.
      const failure = new Error('register failed');
      const adapter = fakeAdapter({ register: sinon.stub().throws(failure) });

      const { service, handlers, error } = construct({ adapter });

      assert.equal(error, failure);
      assert.equal(service, undefined);
      assert.deepEqual(Object.keys(handlers).sort(), [...EVENTS].sort());
    });

    it('subscribes again for every instance constructed', async function () {
      // Incidental: listeners are not deduplicated across instances. The root
      // constructs one instance, so production subscribes once.
      const first = construct();
      const second = construct();
      const model = fakeModel({ id: 'p1', published_at: new Date(NOW + 60_000) });

      await handler(first.handlers, 'post.scheduled')(model);
      await handler(second.handlers, 'post.scheduled')(model);

      sinon.assert.calledOnce(first.adapter.schedule);
      sinon.assert.calledOnce(second.adapter.schedule);
    });
  });

  describe('model events', function () {
    for (const [type, resource] of [
      ['post', 'posts'],
      ['page', 'pages'],
    ] as const) {
      it(`schedules a signed job for ${type}.scheduled at the current published_at`, async function () {
        const { handlers, adapter, internalKeys } = construct();
        const publishedAt = new Date(NOW + 3_600_000);
        const previous = new Date(NOW + 60_000);

        await handler(
          handlers,
          `${type}.scheduled`,
        )(fakeModel({ id: `${type}-1`, published_at: publishedAt }, { published_at: previous }));

        sinon.assert.calledOnceWithExactly(internalKeys.get, 'ghost-scheduler');
        sinon.assert.notCalled(adapter.unschedule);
        sinon.assert.calledOnce(adapter.schedule);
        assert.equal(adapter.schedule.firstCall.args.length, 1);
        assert.deepEqual(
          adapter.schedule.firstCall.args[0],
          expectedJob({
            resource,
            id: `${type}-1`,
            time: publishedAt.getTime(),
            oldTime: previous.getTime(),
          }),
        );
      });

      it(`unschedules the previous job and schedules the new one for ${type}.rescheduled`, async function () {
        const { handlers, adapter, internalKeys } = construct();
        const publishedAt = new Date(NOW + 7_200_000);
        const previous = new Date(NOW + 3_600_000);

        await handler(
          handlers,
          `${type}.rescheduled`,
        )(fakeModel({ id: `${type}-2`, published_at: publishedAt }, { published_at: previous }));

        sinon.assert.calledOnce(internalKeys.get);
        sinon.assert.calledOnce(adapter.unschedule);
        sinon.assert.calledOnce(adapter.schedule);
        sinon.assert.callOrder(adapter.unschedule, adapter.schedule);
        // Real-time unschedules carry no options, so the default adapter
        // tombstones the old job.
        assert.equal(adapter.unschedule.firstCall.args.length, 1);
        assert.deepEqual(
          adapter.unschedule.firstCall.args[0],
          expectedJob({
            resource,
            id: `${type}-2`,
            time: previous.getTime(),
            oldTime: previous.getTime(),
          }),
        );
        assert.deepEqual(
          adapter.schedule.firstCall.args[0],
          expectedJob({
            resource,
            id: `${type}-2`,
            time: publishedAt.getTime(),
            oldTime: previous.getTime(),
          }),
        );
      });

      it(`unschedules the job for the previous published_at on ${type}.unscheduled`, async function () {
        const { handlers, adapter } = construct();
        const previous = new Date(NOW + 3_600_000);

        await handler(
          handlers,
          `${type}.unscheduled`,
        )(
          fakeModel(
            { id: `${type}-3`, published_at: new Date(NOW + 999_000) },
            { published_at: previous },
          ),
        );

        sinon.assert.notCalled(adapter.schedule);
        sinon.assert.calledOnce(adapter.unschedule);
        assert.equal(adapter.unschedule.firstCall.args.length, 1);
        assert.deepEqual(
          adapter.unschedule.firstCall.args[0],
          expectedJob({
            resource,
            id: `${type}-3`,
            time: previous.getTime(),
            oldTime: previous.getTime(),
          }),
        );
      });
    }

    it('sends a null oldTime when there is no previous published_at', async function () {
      const { handlers, adapter } = construct();
      const publishedAt = new Date(NOW + 60_000);

      for (const previous of [null, undefined]) {
        adapter.schedule.resetHistory();
        await handler(
          handlers,
          'post.scheduled',
        )(fakeModel({ id: 'p1', published_at: publishedAt }, { published_at: previous }));
        assert.equal(adapter.schedule.firstCall.args[0].extra.oldTime, null);
      }
    });

    it('reads the scheduler key for every event rather than at construction', async function () {
      const rotated = { id: 'rotated-key-id', secret: 'eeeeffff00001111' };
      const internalKeys = fakeKeys(KEY, rotated);
      const { handlers, adapter } = construct({ internalKeys });
      sinon.assert.notCalled(internalKeys.get);
      const publishedAt = new Date(NOW + 60_000);
      const model = fakeModel({ id: 'p1', published_at: publishedAt });

      await handler(handlers, 'post.scheduled')(model);
      await handler(handlers, 'post.scheduled')(model);

      assert.deepEqual(
        adapter.schedule.secondCall.args[0],
        expectedJob({
          resource: 'posts',
          id: 'p1',
          time: publishedAt.getTime(),
          oldTime: null,
          key: rotated,
        }),
      );
    });

    for (const [name, eventName] of [
      ['post.scheduled', 'post-scheduling.schedule.error'],
      ['page.rescheduled', 'post-scheduling.reschedule.error'],
      ['post.unscheduled', 'post-scheduling.unschedule.error'],
    ] as const) {
      it(`logs and swallows a key failure on ${name}`, async function () {
        const error = logging.error;
        const failure = new Error('no key');
        const internalKeys = { get: sinon.stub().rejects(failure) };
        const { handlers, adapter } = construct({ internalKeys });
        const resource = name.split('.')[0];

        await handler(
          handlers,
          name,
        )(fakeModel({ id: 'r1', published_at: new Date(NOW) }, { published_at: new Date(NOW) }));

        sinon.assert.notCalled(adapter.schedule);
        sinon.assert.notCalled(adapter.unschedule);
        sinon.assert.calledOnce(error);
        assert.deepEqual(error.firstCall.args[0], {
          event: { name: eventName },
          err: failure,
          resource,
          id: 'r1',
        });
        assert.equal(typeof error.firstCall.args[1], 'string');
      });
    }

    it('stops a reschedule when the unschedule throws, logging the failure', async function () {
      const error = logging.error;
      const failure = new Error('unschedule failed');
      const adapter = fakeAdapter({ unschedule: sinon.stub().throws(failure) });
      const { handlers } = construct({ adapter });

      await handler(
        handlers,
        'post.rescheduled',
      )(fakeModel({ id: 'p1', published_at: new Date(NOW) }, { published_at: new Date(NOW) }));

      sinon.assert.notCalled(adapter.schedule);
      sinon.assert.calledOnceWithMatch(error, {
        event: { name: 'post-scheduling.reschedule.error' },
        err: failure,
      });
    });
  });

  describe('signing', function () {
    it('signs the callback for the job time with a six hour expiry and a ten minute lead', async function () {
      const { handlers, adapter } = construct();
      const publishedAt = new Date(NOW + 3_600_000);

      await handler(handlers, 'post.scheduled')(fakeModel({ id: 'p1', published_at: publishedAt }));

      const url = new URL(adapter.schedule.firstCall.args[0].url);
      assert.equal(url.origin + url.pathname, `${API_URL}schedules/posts/p1/`);
      const token = url.searchParams.get('token')!;
      const decoded = jwt.verify(token, Buffer.from(KEY.secret, 'hex'), {
        audience: API_URL,
        algorithms: ['HS256'],
        clockTimestamp: publishedAt.getTime() / 1000,
        complete: true,
      }) as jwt.Jwt;
      assert.equal(decoded.header.kid, KEY.id);
      assert.deepEqual(decoded.payload, {
        exp: publishedAt.getTime() / 1000 + 6 * 3600,
        nbf: publishedAt.getTime() / 1000 - 600,
        aud: API_URL,
      });
    });

    it('gives an overdue job a fresh expiry, so its idempotency key changes with the clock', async function () {
      // Pinned as today's behaviour: a post more than six hours overdue is
      // signed until six hours from now, so the same job rebuilt a minute
      // later has a different URL and idempotency key.
      const PostModel = models.Post;
      const overdue = fakeModel(
        { id: 'late', published_at: new Date(NOW - 7 * 3_600_000) },
        { published_at: new Date(NOW - 7 * 3_600_000) },
      );
      const onTime = fakeModel(
        { id: 'soon', published_at: new Date(NOW + 3_600_000) },
        { published_at: new Date(NOW + 3_600_000) },
      );
      sandbox
        .stub(PostModel, 'findAll')
        .callsFake(async (options) =>
          (options as { filter: string }).filter.endsWith('type:post') ? [overdue, onTime] : [],
        );
      const adapter = fakeAdapter({ dedupesByIdempotencyKey: true });
      const { service } = constructed({ adapter });

      await service.rescheduleAll();
      sinon.clock.tick(60_000);
      await service.rescheduleAll();

      const [lateFirst, soonFirst, lateSecond, soonSecond] = adapter.schedule.args.map(
        ([job]) => job,
      );
      assert.notEqual(lateFirst.extra.idempotencyKey, lateSecond.extra.idempotencyKey);
      assert.equal(soonFirst.extra.idempotencyKey, soonSecond.extra.idempotencyKey);
      const exp = (jwt.decode(new URL(lateSecond.url).searchParams.get('token')!) as jwt.JwtPayload)
        .exp;
      assert.equal(exp, (NOW + 60_000) / 1000 + 6 * 3600);
    });
  });

  describe('time arithmetic', function () {
    async function timeFor(publishedAt: unknown) {
      const { handlers, adapter } = construct();
      await handler(handlers, 'post.scheduled')(fakeModel({ id: 'p1', published_at: publishedAt }));
      return adapter.schedule.firstCall?.args[0];
    }

    it('reads Dates, ISO strings and offsets as absolute instants', async function () {
      // 01:00Z on 29 March 2026 is the start of British Summer Time.
      const springForward = new Date('2026-03-29T01:00:00.000Z');
      assert.equal((await timeFor(springForward)).time, springForward.getTime());
      assert.equal((await timeFor('2026-07-01T12:00:00.000Z')).time, Date.UTC(2026, 6, 1, 12));
      assert.equal((await timeFor('2026-07-01T12:00:00+02:00')).time, Date.UTC(2026, 6, 1, 10));
    });

    it('reads zone-less strings, including DST-ambiguous wall times, as UTC', async function () {
      // Ghost sets Moment's default zone to UTC, so the database format is UTC
      // whatever the host zone. 01:30 on 25 October 2026 happens twice in
      // Europe/London; a host-local parse would pick one of them.
      assert.equal((await timeFor('2026-07-01 12:00:00')).time, Date.UTC(2026, 6, 1, 12));
      assert.equal((await timeFor('2026-10-25 01:30:00')).time, Date.UTC(2026, 9, 25, 1, 30));
      assert.equal((await timeFor('2026-03-29 01:30:00')).time, Date.UTC(2026, 2, 29, 1, 30));
    });

    it('schedules a missing published_at for the current time', async function () {
      // Incidental: Moment reads undefined as now.
      const job = await timeFor(undefined);
      assert.equal(job.time, NOW);
    });

    it('logs instead of scheduling a null published_at', async function () {
      // Incidental: Moment reads null as an invalid date, whose ISO string
      // throws while signing.
      const error = logging.error;
      assert.equal(await timeFor(null), undefined);
      sinon.assert.calledOnceWithMatch(error, { err: sinon.match.instanceOf(RangeError) });
    });
  });

  describe('rescheduleAll', function () {
    function stubScheduled({ posts = [] as unknown[], pages = [] as unknown[] } = {}) {
      return sandbox
        .stub(models.Post, 'findAll')
        .callsFake(async (options) =>
          (options as { filter: string }).filter.endsWith('type:post') ? posts : pages,
        );
    }

    const post = (id: string, offset: number) =>
      fakeModel(
        { id, published_at: new Date(NOW + offset) },
        { published_at: new Date(NOW + offset) },
      );

    it('loads scheduled posts and pages through the Post model', async function () {
      const findAll = stubScheduled();
      const { service } = constructed();

      assert.equal(await service.rescheduleAll(), undefined);

      sinon.assert.calledTwice(findAll);
      assert.deepEqual(
        findAll.args.map(([options]) => options),
        [
          {
            filter: 'status:scheduled+type:post',
            columns: ['id', 'published_at', 'created_at', 'type'],
          },
          {
            filter: 'status:scheduled+type:page',
            columns: ['id', 'published_at', 'created_at', 'type'],
          },
        ],
      );
    });

    it('rebuilds on boot with a bootstrap unschedule before each schedule, posts before pages', async function () {
      stubScheduled({
        posts: [post('p1', 60_000), post('p2', 120_000)],
        pages: [post('g1', 180_000)],
      });
      const calls: unknown[][] = [];
      const adapter = fakeAdapter({
        schedule: sinon.stub().callsFake((...args) => calls.push(['schedule', ...args])),
        unschedule: sinon.stub().callsFake((...args) => calls.push(['unschedule', ...args])),
      });
      const internalKeys = fakeKeys(KEY);
      const { service } = constructed({ adapter, internalKeys });

      await service.rescheduleAll();

      sinon.assert.calledOnceWithExactly(internalKeys.get, 'ghost-scheduler');
      const job = (resource: 'posts' | 'pages', id: string, offset: number) =>
        expectedJob({ resource, id, time: NOW + offset, oldTime: NOW + offset });
      assert.deepEqual(calls, [
        ['unschedule', job('posts', 'p1', 60_000), { bootstrap: true }],
        ['schedule', job('posts', 'p1', 60_000)],
        ['unschedule', job('posts', 'p2', 120_000), { bootstrap: true }],
        ['schedule', job('posts', 'p2', 120_000)],
        ['unschedule', job('pages', 'g1', 180_000), { bootstrap: true }],
        ['schedule', job('pages', 'g1', 180_000)],
      ]);
    });

    it('only schedules on boot when the adapter dedupes by idempotency key, read at call time', async function () {
      stubScheduled({ posts: [post('p1', 60_000)] });
      const adapter = fakeAdapter();
      const { service } = constructed({ adapter });

      Object.assign(adapter, { dedupesByIdempotencyKey: true });
      await service.rescheduleAll();

      sinon.assert.notCalled(adapter.unschedule);
      sinon.assert.calledOnceWithExactly(
        adapter.schedule,
        expectedJob({ resource: 'posts', id: 'p1', time: NOW + 60_000, oldTime: NOW + 60_000 }),
      );
    });

    it('unschedules jobs signed with the previous key on rotation, even for a deduping adapter', async function () {
      stubScheduled({ pages: [post('g1', 60_000)] });
      const previousKey = { id: 'scheduler-key-id', secret: '9999888877776666' };
      const adapter = fakeAdapter({ dedupesByIdempotencyKey: true });
      const { service } = constructed({ adapter });

      await service.rescheduleAll({ previousKey });

      const job = {
        resource: 'pages',
        id: 'g1',
        time: NOW + 60_000,
        oldTime: NOW + 60_000,
      } as const;
      sinon.assert.calledOnceWithExactly(
        adapter.unschedule,
        expectedJob({ ...job, key: previousKey }),
        { bootstrap: false },
      );
      sinon.assert.calledOnceWithExactly(adapter.schedule, expectedJob(job));
      sinon.assert.callOrder(adapter.unschedule, adapter.schedule);
    });

    it('rejects without scheduling when loading or the key fails', async function () {
      const loadFailure = new Error('database down');
      sandbox.stub(models.Post, 'findAll').rejects(loadFailure);
      const adapter = fakeAdapter();
      const { service } = constructed({ adapter });
      await assert.rejects(service.rescheduleAll(), (err) => err === loadFailure);

      sandbox.restore();
      stubScheduled({ posts: [post('p1', 60_000)] });
      const keyFailure = new Error('no key');
      const failing = constructed({
        adapter,
        internalKeys: { get: sinon.stub().rejects(keyFailure) },
      });
      await assert.rejects(failing.service.rescheduleAll(), (err) => err === keyFailure);

      sinon.assert.notCalled(adapter.schedule);
      sinon.assert.notCalled(adapter.unschedule);
    });
  });
});
