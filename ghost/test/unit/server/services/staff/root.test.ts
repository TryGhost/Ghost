import assert from 'node:assert/strict';
import sinon from 'sinon';

const DomainEvents = require('@tryghost/domain-events');
const handlebars = require('handlebars');
const logging = require('@tryghost/logging');
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/lib/mail');
const settingsCache = require('../../../../../core/shared/settings-cache');
const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const { blogIcon } = require('../../../../../core/server/lib/image');
const memberAttribution = require('../../../../../core/server/services/member-attribution').default;
const {
  MemberCreatedEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
} = require('../../../../../core/shared/events');
const MilestoneCreatedEvent = require('../../../../../core/server/services/milestones/milestone-created-event');
const Milestone = require('../../../../../core/server/services/milestones/milestone');
const MilestonesService = require('../../../../../core/server/services/milestones/milestones-service');
const InMemoryMilestoneRepository = require('../../../../../core/server/services/milestones/in-memory-milestone-repository');
const StaffService = require('../../../../../core/server/services/staff/staff-service');
const StaffServiceEmails = require('../../../../../core/server/services/staff/staff-service-emails');
const STAFF_PATH = require.resolve('../../../../../core/server/services/staff');
const GIFTS_PATH = require.resolve('../../../../../core/server/services/gifts');
const STRIPE_PATHS = [
  require.resolve('../../../../../core/server/services/stripe'),
  require.resolve('../../../../../core/server/services/stripe/service'),
];

type Handler = (event: unknown) => Promise<void>;
type Root = { init(): Promise<void>; readonly service: StaffApi };
type StaffApi = {
  emails: { mailer: unknown };
  memberAttributionService: unknown;
  DomainEvents: unknown;
};

const SUBSCRIBED_EVENTS = [
  MemberCreatedEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  MilestoneCreatedEvent,
];

// A freshly loaded root, so these cases never depend on, or change, the root
// other files in this worker have initialized.
function createRoot(): Root {
  const saved = require.cache[STAFF_PATH];
  delete require.cache[STAFF_PATH];
  try {
    return require(STAFF_PATH).default;
  } finally {
    delete require.cache[STAFF_PATH];
    if (saved) {
      require.cache[STAFF_PATH] = saved;
    }
  }
}

const BEFORE_INIT = { name: 'IncorrectUsageError', message: /^Staff used before init\(\)/ };

describe('Staff service root', function () {
  const sandbox = sinon.createSandbox();
  let subscribe: sinon.SinonStub;
  let send: sinon.SinonStub;
  let attribution: Record<string, sinon.SinonStub>;
  let getAttribution: sinon.SinonStub;

  beforeEach(function () {
    // Capture the handlers instead of installing them on the shared event bus.
    subscribe = sandbox.stub(DomainEvents, 'subscribe');
    send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves({});
    attribution = {
      getMemberCreatedAttribution: sandbox.stub().resolves(null),
      getSubscriptionCreatedAttribution: sandbox.stub().resolves(null),
      fetchResource: sandbox.stub().resolves(null),
    };
    getAttribution = sandbox.stub(memberAttribution, 'service').get(() => attribution);
    sandbox.stub(logging, 'warn');
    sandbox.stub(logging, 'error');
    const getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('title').returns('Staff Site');
    getSetting.withArgs('accent_color').returns('#123456');
    sandbox
      .stub(settingsHelpers, 'getDefaultEmail')
      .returns({ address: 'noreply@site.example', name: 'Staff Site' });
    sandbox.stub(urlUtils, 'getSiteUrl').returns('https://site.example/');
    sandbox.stub(urlUtils, 'urlFor').withArgs('admin', true).returns('https://site.example/ghost/');
    sandbox.stub(blogIcon, 'getIconUrl').returns(null);
    sandbox
      .stub(models.User, 'getEmailAlertUsers')
      .resolves([{ email: 'owner@site.example', slug: 'owner' }]);
  });

  afterEach(function () {
    sandbox.restore();
  });

  function handlerFor(Event: unknown): Handler {
    const call = subscribe.getCalls().find((candidate) => candidate.args[0] === Event);
    assert.ok(call, `no handler subscribed for ${String(Event)}`);
    return call.args[1];
  }

  describe('exports and initialization', function () {
    it('default-exports a root with only init and a service getter that throws until init resolves', async function () {
      assert.deepEqual(Object.keys(require(STAFF_PATH)), ['default']);
      const root = createRoot();
      assert.deepEqual(Object.keys(root), ['init', 'service']);
      assert.throws(() => root.service, BEFORE_INIT);

      const initialization = root.init();
      assert.ok(initialization instanceof Promise);
      assert.equal(await initialization, undefined);
      assert.ok(root.service instanceof StaffService);
    });

    it('composes the service with the ready attribution instance, its emails helper and mailer', async function () {
      const root = createRoot();
      await root.init();

      const api = root.service;
      assert.equal(api.memberAttributionService, attribution);
      assert.equal(api.DomainEvents, DomainEvents);
      assert.ok(api.emails instanceof StaffServiceEmails);
      assert.ok(api.emails.mailer instanceof mail.GhostMailer);
    });

    it('subscribes the four notification handlers once, in order, across repeated init', async function () {
      const root = createRoot();
      await root.init();
      const api = root.service;
      const emails = api.emails;

      await root.init();

      assert.equal(root.service, api);
      assert.equal(root.service.emails, emails);
      assert.deepEqual(
        subscribe.getCalls().map((call) => call.args[0]),
        SUBSCRIBED_EVENTS,
      );
      for (const call of subscribe.getCalls()) {
        assert.equal(typeof call.args[1], 'function');
      }
    });

    it('fails without subscribing while member attribution is unavailable, and a later init succeeds', async function () {
      const failure = new Error('Member attribution used before init()');
      getAttribution.get(() => {
        throw failure;
      });
      const root = createRoot();

      await assert.rejects(root.init(), (error) => error === failure);
      assert.throws(() => root.service, BEFORE_INIT);
      sinon.assert.notCalled(subscribe);

      getAttribution.get(() => attribution);
      await root.init();

      assert.equal(root.service.memberAttributionService, attribution);
      sinon.assert.callCount(subscribe, 4);
    });

    it('fails without subscribing when the renderer cannot be built, and a later init succeeds', async function () {
      const failure = new Error('renderer unavailable');
      const create = sandbox.stub(handlebars, 'create').throws(failure);
      const root = createRoot();

      await assert.rejects(root.init(), (error) => error === failure);
      assert.throws(() => root.service, BEFORE_INIT);
      sinon.assert.notCalled(subscribe);

      create.restore();
      await root.init();

      assert.ok(root.service instanceof StaffService);
      sinon.assert.callCount(subscribe, 4);
    });

    it('keeps partial subscriptions and blocks re-subscription after a subscription failure', async function () {
      // A failed subscription leaves earlier handlers registered because the event
      // bus has no unsubscribe, so the root refuses later init calls rather than
      // registering those handlers twice.
      const failure = new Error('subscription failed');
      subscribe.onThirdCall().throws(failure);
      const root = createRoot();

      await assert.rejects(root.init(), (error) => error === failure);
      assert.throws(() => root.service, BEFORE_INIT);
      sinon.assert.callCount(subscribe, 3);

      await assert.rejects(root.init(), {
        name: 'IncorrectUsageError',
        message: /partly subscribed by an earlier failed init/,
      });

      assert.throws(() => root.service, BEFORE_INIT);
      sinon.assert.callCount(subscribe, 3);
    });

    it('keeps using the attribution instance captured at init after the attribution root changes', async function () {
      const root = createRoot();
      await root.init();
      const replacement = {
        getMemberCreatedAttribution: sandbox.stub().resolves(null),
        fetchResource: sandbox.stub().resolves(null),
      };
      getAttribution.get(() => replacement);
      sandbox.stub(models.Member, 'findOne').resolves({
        toJSON: () => ({ id: 'member-1', email: 'member@example.com', status: 'free' }),
      });

      await handlerFor(MemberCreatedEvent)(
        MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }),
      );

      assert.equal(root.service.memberAttributionService, attribution);
      sinon.assert.calledOnceWithExactly(attribution.getMemberCreatedAttribution, 'member-1');
      sinon.assert.notCalled(replacement.getMemberCreatedAttribution);
      sinon.assert.calledOnce(send);
    });
  });

  describe('consumers', function () {
    const paths = [STAFF_PATH, GIFTS_PATH, ...STRIPE_PATHS];
    let saved: (NodeJS.Module | undefined)[];
    let staff: Root;

    // Fresh Staff, Gifts and Stripe roots, so the consumers bind to an uninitialized
    // Staff root and the singletons other files initialize are untouched.
    beforeEach(function () {
      saved = paths.map((modulePath) => require.cache[modulePath]);
      for (const modulePath of paths) {
        delete require.cache[modulePath];
      }
      staff = require(STAFF_PATH).default;
    });

    afterEach(function () {
      paths.forEach((modulePath, index) => {
        delete require.cache[modulePath];
        const entry = saved[index];
        if (entry) {
          require.cache[modulePath] = entry;
        }
      });
    });

    async function assertReadOnEachAccess(deps: { staffServiceEmails: unknown }) {
      assert.throws(() => deps.staffServiceEmails, BEFORE_INIT);

      await staff.init();
      assert.equal(deps.staffServiceEmails, staff.service.emails);

      const replacement = {};
      sandbox.stub(staff, 'service').get(() => ({ emails: replacement }));
      assert.equal(deps.staffServiceEmails, replacement);
    }

    it('gives Stripe donation checkout the staff emails read at each access', async function () {
      const stripe = require('../../../../../core/server/services/stripe');

      await assertReadOnEachAccess(stripe.webhookController.checkoutSessionEventService.deps);
    });

    it('gives Gifts the staff emails read at each access', async function () {
      const gifts = require('../../../../../core/server/services/gifts');
      gifts.init({
        apiUrl: 'https://site.example/ghost/api/admin/',
        schedulerAdapter: { register: sandbox.stub() },
        internalKeys: {},
        checkouts: { read: sandbox.stub() },
      });

      await assertReadOnEachAccess(
        (gifts.service as { deps: { staffServiceEmails: unknown } }).deps,
      );
    });
  });

  describe('milestone persistence to mail', function () {
    const day = 24 * 60 * 60 * 1000;
    let dispatched: unknown[];
    let hasImportedMembers: boolean;

    beforeEach(function () {
      dispatched = [];
      hasImportedMembers = false;
    });

    async function reachMembersMilestone() {
      const repository = new InMemoryMilestoneRepository({
        DomainEvents: { dispatch: (event: unknown) => dispatched.push(event) },
      });
      // An earlier milestone, emailed long enough ago, so this is not the initial run
      // and the last-email interval allows another email.
      await repository.save(
        await Milestone.create({
          type: 'members',
          value: 100,
          createdAt: new Date(Date.now() - 60 * day),
          emailSentAt: new Date(Date.now() - 60 * day),
        }),
      );
      dispatched = [];
      const service = new MilestonesService({
        repository,
        milestonesConfig: { members: [100, 1000], minDaysSinceLastEmail: 14 },
        queries: {
          getMembersCount: async () => 1200,
          hasImportedMembersInPeriod: async () => hasImportedMembers,
          getDefaultCurrency: async () => 'usd',
        },
      });
      await service.checkMilestones('members');
      assert.equal(dispatched.length, 1);
      return dispatched[0] as { data: { milestone: unknown; meta: Record<string, unknown> } };
    }

    it('mails a saved milestone whose email was scheduled', async function () {
      const root = createRoot();
      await root.init();
      const event = await reachMembersMilestone();
      assert.ok(event instanceof MilestoneCreatedEvent);
      assert.ok(event.data.milestone instanceof Milestone);

      await handlerFor(MilestoneCreatedEvent)(event);

      sinon.assert.calledOnce(send);
      assert.equal(send.firstCall.args[0].to, 'owner@site.example');
      assert.equal(send.firstCall.args[0].subject, 'Staff Site now has 1,000 members');
    });

    it('does not mail a saved milestone suppressed by a recent import', async function () {
      hasImportedMembers = true;
      const root = createRoot();
      await root.init();
      const event = await reachMembersMilestone();
      // The production entity carries the reason beside the milestone, not on it.
      assert.equal(event.data.meta.reason, 'import');
      assert.equal((event.data.milestone as { meta?: unknown }).meta, undefined);

      await handlerFor(MilestoneCreatedEvent)(event);

      sinon.assert.notCalled(send);
    });

    it('gates delivery on emailSentAt and ignores a reason carried beside the milestone', async function () {
      // Pinned as current behaviour: Staff reads milestone.meta.reason, which the
      // entity never has. Production only attaches a reason when emailSentAt is
      // null, so this combination does not occur from MilestonesService today.
      const root = createRoot();
      await root.init();
      const milestone = await Milestone.create({
        type: 'members',
        value: 1000,
        emailSentAt: new Date(),
        meta: { reason: 'import' },
      });
      const [event] = milestone.events;
      assert.equal(event.data.meta.reason, 'import');

      await handlerFor(MilestoneCreatedEvent)(event);

      sinon.assert.calledOnce(send);
    });
  });
});
