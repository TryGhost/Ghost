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
const {
  services,
}: typeof import('../../../../utils/services') = require('../../../../utils/services');
const GIFTS_PATH = require.resolve('../../../../../core/server/services/gifts');
const STRIPE_PATHS = [
  require.resolve('../../../../../core/server/services/stripe'),
  require.resolve('../../../../../core/server/services/stripe/service'),
];

type Handler = (event: unknown) => Promise<void>;
type Root = typeof import('../../../../../core/server/services/staff').default;

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

const NOT_STARTED = {
  name: 'IncorrectUsageError',
  message: /^Staff was used while Ghost is not started/,
};

// What boot does with a declared definition: it attaches the listeners, builds
// nothing, and lets services be built from the services step on.
function declare(root: Root) {
  services.register(root);
  services.open();
  return root;
}

describe('Staff service root', function () {
  const sandbox = sinon.createSandbox();
  let subscribe: sinon.SinonStub;
  let send: sinon.SinonStub;
  let attribution: Record<string, sinon.SinonStub>;
  let getAttribution: sinon.SinonStub;
  let attributionReads: number;

  beforeEach(function () {
    // Capture the handlers instead of installing them on the shared event bus.
    subscribe = sandbox.stub(DomainEvents, 'subscribe');
    send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves({});
    attribution = {
      getMemberCreatedAttribution: sandbox.stub().resolves(null),
      getSubscriptionCreatedAttribution: sandbox.stub().resolves(null),
      fetchResource: sandbox.stub().resolves(null),
    };
    // Reading member attribution is the first thing building Staff does.
    attributionReads = 0;
    getAttribution = sandbox.stub(memberAttribution, 'service').get(() => {
      attributionReads += 1;
      return attribution;
    });
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

  afterEach(async function () {
    await services.close();
    sandbox.restore();
  });

  function handlerFor(Event: unknown): Handler {
    const call = subscribe.getCalls().find((candidate) => candidate.args[0] === Event);
    assert.ok(call, `no handler subscribed for ${String(Event)}`);
    return call.args[1];
  }

  describe('exports and building', function () {
    it('default-exports a definition that builds nothing, with a service getter that refuses until Ghost has started', function () {
      assert.deepEqual(Object.keys(require(STAFF_PATH)), ['default']);
      const root = createRoot();
      assert.deepEqual(Object.keys(root), ['name', 'needs', 'create', 'listeners', 'service']);
      assert.throws(() => root.service, NOT_STARTED);
      sinon.assert.notCalled(subscribe);
      assert.equal(attributionReads, 0);

      declare(root);
      assert.equal(attributionReads, 0);
      assert.ok(root.service instanceof StaffService);
    });

    it('composes the service with the attribution instance it is handed, its emails helper and mailer', function () {
      const root = declare(createRoot());

      const api = root.service;
      assert.equal(api.memberAttributionService, attribution);
      assert.ok(api.emails instanceof StaffServiceEmails);
      assert.ok(api.emails.mailer instanceof mail.GhostMailer);
    });

    it('declares the four notification listeners, which boot attaches once without building the service', function () {
      const root = createRoot();
      declare(root);
      declare(root);

      assert.deepEqual(
        subscribe.getCalls().map((call) => call.args[0]),
        SUBSCRIBED_EVENTS,
      );
      for (const call of subscribe.getCalls()) {
        assert.equal(typeof call.args[1], 'function');
      }
      assert.equal(attributionReads, 0);

      const api = root.service;
      assert.equal(root.service, api);
      sinon.assert.callCount(subscribe, 4);
    });

    it('is refused when nothing declared it, so that its listeners cannot be missed', function () {
      const root = createRoot();
      services.open();

      assert.throws(() => root.service, {
        name: 'IncorrectUsageError',
        message: /^Staff declares listeners or a start, but Ghost does not register it/,
      });
    });

    it('builds the service for an event published before anything has used it', async function () {
      const root = declare(createRoot());
      sandbox.stub(models.Member, 'findOne').resolves({
        toJSON: () => ({ id: 'member-1', email: 'member@example.com', status: 'free' }),
      });
      assert.equal(attributionReads, 0);

      await handlerFor(MemberCreatedEvent)(
        MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }),
      );

      sinon.assert.calledOnceWithExactly(attribution.getMemberCreatedAttribution, 'member-1');
      sinon.assert.calledOnce(send);
      assert.equal(root.service.memberAttributionService, attribution);
    });

    it('fails to build while member attribution is unavailable, and builds on a later use', function () {
      const failure = new Error('Member attribution used before init()');
      getAttribution.get(() => {
        throw failure;
      });
      const root = declare(createRoot());

      assert.throws(
        () => root.service,
        (error) => error === failure,
      );

      getAttribution.get(() => attribution);

      assert.equal(root.service.memberAttributionService, attribution);
      sinon.assert.callCount(subscribe, 4);
    });

    it('fails to build when the renderer cannot be built, and builds on a later use', function () {
      const failure = new Error('renderer unavailable');
      const create = sandbox.stub(handlebars, 'create').throws(failure);
      const root = declare(createRoot());

      assert.throws(
        () => root.service,
        (error) => error === failure,
      );

      create.restore();

      assert.ok(root.service instanceof StaffService);
      sinon.assert.callCount(subscribe, 4);
    });

    it('keeps using the attribution instance it was built with after the attribution root changes', async function () {
      const root = declare(createRoot());
      assert.ok(root.service);
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

    it('is built again by the next start, with what is stubbed then, and listens only once', async function () {
      const root = declare(createRoot());
      const first = root.service;
      const replacement = { fetchResource: sandbox.stub().resolves(null) };

      await services.close();
      assert.throws(() => root.service, NOT_STARTED);
      getAttribution.get(() => replacement);
      declare(root);

      assert.notEqual(root.service, first);
      assert.equal(first.memberAttributionService, attribution);
      assert.equal(root.service.memberAttributionService, replacement);
      sinon.assert.callCount(subscribe, 4);
    });
  });

  describe('consumers', function () {
    const paths = [STAFF_PATH, GIFTS_PATH, ...STRIPE_PATHS];
    let saved: (NodeJS.Module | undefined)[];
    let staff: Root;

    // Fresh Staff, Gifts and Stripe roots, so the consumers bind to a Staff root
    // nothing has built and the singletons other files initialize are untouched.
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
      assert.throws(() => deps.staffServiceEmails, NOT_STARTED);

      declare(staff);
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
      declare(createRoot());
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
      declare(createRoot());
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
      declare(createRoot());
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
