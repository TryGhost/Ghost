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
const staffRoot = require('../../../../../core/server/services/staff');

type Handler = (event: unknown) => Promise<void>;
type Root = { init(): unknown; api?: StaffApi };
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

// A wrapper of the same class as the exported singleton, so these cases never
// depend on, or change, the root other files in this worker have initialized.
function createRoot(): Root {
  return new staffRoot.constructor();
}

function apiOf(root: Root): StaffApi {
  assert.ok(root.api);
  return root.api;
}

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
    it('exports one wrapper whose only operation is a synchronous init with no api until it runs', function () {
      const prototype = Object.getPrototypeOf(staffRoot);
      assert.deepEqual(Object.getOwnPropertyNames(prototype), ['constructor', 'init']);
      const root = createRoot();
      assert.equal(root.api, undefined);

      assert.equal(root.init(), undefined);
      assert.ok(apiOf(root) instanceof StaffService);
    });

    it('composes the service with the ready attribution instance, its emails helper and mailer', function () {
      const root = createRoot();
      root.init();

      const api = root.api as StaffApi;
      assert.equal(api.memberAttributionService, attribution);
      assert.equal(api.DomainEvents, DomainEvents);
      assert.ok(api.emails instanceof StaffServiceEmails);
      assert.ok(api.emails.mailer instanceof mail.GhostMailer);
    });

    it('subscribes the four notification handlers once, in order, across repeated init', function () {
      const root = createRoot();
      root.init();
      const api = root.api;
      const emails = api?.emails;

      root.init();

      assert.equal(root.api, api);
      assert.equal(root.api?.emails, emails);
      assert.deepEqual(
        subscribe.getCalls().map((call) => call.args[0]),
        SUBSCRIBED_EVENTS,
      );
      for (const call of subscribe.getCalls()) {
        assert.equal(typeof call.args[1], 'function');
      }
    });

    it('fails without subscribing while member attribution is unavailable, and a later init succeeds', function () {
      const failure = new Error('Member attribution used before init()');
      getAttribution.get(() => {
        throw failure;
      });
      const root = createRoot();

      assert.throws(
        () => root.init(),
        (error) => error === failure,
      );
      assert.equal(root.api, undefined);
      sinon.assert.notCalled(subscribe);

      getAttribution.get(() => attribution);
      root.init();

      assert.equal(apiOf(root).memberAttributionService, attribution);
      sinon.assert.callCount(subscribe, 4);
    });

    it('fails without subscribing when the renderer cannot be built, and a later init succeeds', function () {
      const failure = new Error('renderer unavailable');
      const create = sandbox.stub(handlebars, 'create').throws(failure);
      const root = createRoot();

      assert.throws(
        () => root.init(),
        (error) => error === failure,
      );
      assert.equal(root.api, undefined);
      sinon.assert.notCalled(subscribe);

      create.restore();
      root.init();

      assert.ok(apiOf(root) instanceof StaffService);
      sinon.assert.callCount(subscribe, 4);
    });

    it('keeps partial subscriptions and blocks re-subscription after a subscription failure', function () {
      // Pinned as today's behaviour: the api is assigned before subscribing, so a
      // failed subscription leaves earlier handlers registered (the event bus has
      // no unsubscribe) and the api guard turns later init calls into no-ops.
      const failure = new Error('subscription failed');
      subscribe.onThirdCall().throws(failure);
      const root = createRoot();

      assert.throws(
        () => root.init(),
        (error) => error === failure,
      );
      const api = apiOf(root);
      assert.ok(api instanceof StaffService);
      sinon.assert.callCount(subscribe, 3);

      root.init();

      assert.equal(root.api, api);
      sinon.assert.callCount(subscribe, 3);
    });

    it('keeps using the attribution instance captured at init after the attribution root changes', async function () {
      const root = createRoot();
      root.init();
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

      assert.equal(root.api?.memberAttributionService, attribution);
      sinon.assert.calledOnceWithExactly(attribution.getMemberCreatedAttribution, 'member-1');
      sinon.assert.notCalled(replacement.getMemberCreatedAttribution);
      sinon.assert.calledOnce(send);
    });
  });

  describe('consumers', function () {
    let hadApi: boolean;
    let savedApi: unknown;

    beforeEach(function () {
      hadApi = Object.hasOwn(staffRoot, 'api');
      savedApi = staffRoot.api;
      delete staffRoot.api;
    });

    afterEach(function () {
      if (hadApi) {
        staffRoot.api = savedApi;
      } else {
        delete staffRoot.api;
      }
    });

    it('gives Stripe donation checkout the staff emails read at each access', function () {
      const stripe = require('../../../../../core/server/services/stripe');
      const deps = stripe.webhookController.checkoutSessionEventService.deps;

      assert.throws(() => deps.staffServiceEmails, TypeError);

      const first = {};
      staffRoot.api = { emails: first };
      assert.equal(deps.staffServiceEmails, first);

      const second = {};
      staffRoot.api = { emails: second };
      assert.equal(deps.staffServiceEmails, second);
    });

    it('gives Gifts the staff emails read at each access', function () {
      const giftsPath = require.resolve('../../../../../core/server/services/gifts');
      const saved = require.cache[giftsPath];
      delete require.cache[giftsPath];
      try {
        // A fresh Gifts root, so the singleton other files initialize is untouched.
        const gifts = require('../../../../../core/server/services/gifts');
        gifts.init({
          apiUrl: 'https://site.example/ghost/api/admin/',
          schedulerAdapter: { register: sandbox.stub() },
          internalKeys: {},
          checkouts: { read: sandbox.stub() },
        });
        const deps = (gifts.service as { deps: { staffServiceEmails: unknown } }).deps;

        assert.throws(() => deps.staffServiceEmails, TypeError);

        const first = {};
        staffRoot.api = { emails: first };
        assert.equal(deps.staffServiceEmails, first);

        const second = {};
        staffRoot.api = { emails: second };
        assert.equal(deps.staffServiceEmails, second);
      } finally {
        delete require.cache[giftsPath];
        if (saved) {
          require.cache[giftsPath] = saved;
        }
      }
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
      root.init();
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
      root.init();
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
      root.init();
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
