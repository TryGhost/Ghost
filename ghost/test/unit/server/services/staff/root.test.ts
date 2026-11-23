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
  openServices,
  services,
}: typeof import('../../../../utils/services') = require('../../../../utils/services');
const GIFTS_PATH = require.resolve('../../../../../core/server/services/gifts');
const STRIPE_PATHS = [
  require.resolve('../../../../../core/server/services/stripe'),
  require.resolve('../../../../../core/server/services/stripe/service'),
];

type Root = typeof import('../../../../../core/server/services/staff').default;

// The root Ghost registers. A fresh copy would have to be registered too, and would then keep
// listening for the rest of the worker's tests.
const root: Root = require(STAFF_PATH).default;

const LISTENED_EVENTS = [
  MemberCreatedEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  MilestoneCreatedEvent,
];

const CANNOT_BUILD = {
  name: 'IncorrectUsageError',
  message: /^Staff was used while Ghost cannot build services/,
};

// Publishes an event as Ghost does and waits for every listener to finish.
async function publish(event: unknown) {
  DomainEvents.dispatch(event);
  await DomainEvents.allSettled();
}

describe('Staff service root', function () {
  const sandbox = sinon.createSandbox();
  let send: sinon.SinonStub;
  let attribution: Record<string, sinon.SinonStub>;
  let createAttribution: sinon.SinonStub;

  beforeEach(function () {
    send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves({});
    attribution = {
      getMemberCreatedAttribution: sandbox.stub().resolves(null),
      getSubscriptionCreatedAttribution: sandbox.stub().resolves(null),
      fetchResource: sandbox.stub().resolves(null),
    };
    // Staff needs member attribution, so building Staff builds this first.
    createAttribution = sandbox.stub(memberAttribution, 'create').returns(attribution);
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

  describe('exports and building', function () {
    it('default-exports a definition that builds nothing until the service is first used', function () {
      assert.deepEqual(Object.keys(require(STAFF_PATH)), ['default']);
      assert.deepEqual(Object.keys(root), ['name', 'needs', 'create', 'listeners', 'service']);
      assert.throws(() => root.service, CANNOT_BUILD);
      sinon.assert.notCalled(createAttribution);

      openServices();
      sinon.assert.notCalled(createAttribution);
      assert.ok(root.service instanceof StaffService);
      sinon.assert.calledOnce(createAttribution);
    });

    it('composes the service with the attribution instance it is handed, its emails helper and mailer', function () {
      openServices();

      const api = root.service;
      assert.equal(api.memberAttributionService, attribution);
      assert.ok(api.emails instanceof StaffServiceEmails);
      assert.ok(api.emails.mailer instanceof mail.GhostMailer);
    });

    it('declares the four notification listeners, and an event is delivered once however often services are opened', async function () {
      assert.deepEqual(
        root.listeners.map((listener) => listener.event),
        LISTENED_EVENTS,
      );
      sandbox.stub(models.Member, 'findOne').resolves({
        toJSON: () => ({ id: 'member-1', email: 'member@example.com', status: 'free' }),
      });

      openServices();
      openServices();
      sinon.assert.notCalled(createAttribution);

      await publish(MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }));

      sinon.assert.calledOnce(send);
    });

    it('is refused when Ghost was not told about it, so that its listeners cannot be missed', function () {
      // A fresh copy of the root, which nothing registers.
      const saved = require.cache[STAFF_PATH];
      delete require.cache[STAFF_PATH];
      let unregistered: Root;
      try {
        unregistered = require(STAFF_PATH).default;
      } finally {
        delete require.cache[STAFF_PATH];
        if (saved) {
          require.cache[STAFF_PATH] = saved;
        }
      }
      openServices();

      assert.throws(() => unregistered.service, {
        name: 'IncorrectUsageError',
        message: /^Staff declares listeners or a start, but Ghost does not register it/,
      });
    });

    it('builds the service for an event published before anything has used it', async function () {
      openServices();
      sandbox.stub(models.Member, 'findOne').resolves({
        toJSON: () => ({ id: 'member-1', email: 'member@example.com', status: 'free' }),
      });
      sinon.assert.notCalled(createAttribution);

      await publish(MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }));

      sinon.assert.calledOnceWithExactly(attribution.getMemberCreatedAttribution, 'member-1');
      sinon.assert.calledOnce(send);
      assert.equal(root.service.memberAttributionService, attribution);
    });

    it('fails to build while member attribution is unavailable, and builds on a later use', function () {
      const failure = new Error('Member attribution is unavailable');
      createAttribution.throws(failure);
      openServices();

      assert.throws(
        () => root.service,
        (error) => error === failure,
      );

      createAttribution.returns(attribution);

      assert.equal(root.service.memberAttributionService, attribution);
    });

    it('fails to build when the renderer cannot be built, and builds on a later use', function () {
      const failure = new Error('renderer unavailable');
      const create = sandbox.stub(handlebars, 'create').throws(failure);
      openServices();

      assert.throws(
        () => root.service,
        (error) => error === failure,
      );

      create.restore();

      assert.ok(root.service instanceof StaffService);
    });

    it('keeps using the attribution instance it was built with for as long as Ghost runs', async function () {
      openServices();
      assert.ok(root.service);
      const replacement = {
        getMemberCreatedAttribution: sandbox.stub().resolves(null),
        fetchResource: sandbox.stub().resolves(null),
      };
      createAttribution.returns(replacement);
      sandbox.stub(models.Member, 'findOne').resolves({
        toJSON: () => ({ id: 'member-1', email: 'member@example.com', status: 'free' }),
      });

      await publish(MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }));

      assert.equal(root.service.memberAttributionService, attribution);
      sinon.assert.calledOnceWithExactly(attribution.getMemberCreatedAttribution, 'member-1');
      sinon.assert.notCalled(replacement.getMemberCreatedAttribution);
      sinon.assert.calledOnce(send);
    });

    it('is built again after Ghost stops and starts, with the attribution built then, and delivers an event once', async function () {
      openServices();
      const first = root.service;
      const replacement = {
        getMemberCreatedAttribution: sandbox.stub().resolves(null),
        fetchResource: sandbox.stub().resolves(null),
      };
      sandbox.stub(models.Member, 'findOne').resolves({
        toJSON: () => ({ id: 'member-1', email: 'member@example.com', status: 'free' }),
      });

      await services.close();
      assert.throws(() => root.service, CANNOT_BUILD);
      // Nothing listens while Ghost is stopped.
      await publish(MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }));
      sinon.assert.notCalled(send);

      createAttribution.returns(replacement);
      openServices();

      assert.notEqual(root.service, first);
      assert.equal(first.memberAttributionService, attribution);
      assert.equal(root.service.memberAttributionService, replacement);

      await publish(MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' }));

      sinon.assert.notCalled(attribution.getMemberCreatedAttribution);
      sinon.assert.calledOnceWithExactly(replacement.getMemberCreatedAttribution, 'member-1');
      sinon.assert.calledOnce(send);
    });
  });

  describe('consumers', function () {
    const paths = [GIFTS_PATH, ...STRIPE_PATHS];
    let saved: (NodeJS.Module | undefined)[];

    // Fresh Gifts and Stripe roots, so the singletons other files initialize are untouched.
    // They bind to the Staff root Ghost registers.
    beforeEach(function () {
      saved = paths.map((modulePath) => require.cache[modulePath]);
      for (const modulePath of paths) {
        delete require.cache[modulePath];
      }
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

    function assertReadOnEachAccess(deps: { staffServiceEmails: unknown }) {
      assert.throws(() => deps.staffServiceEmails, CANNOT_BUILD);

      openServices();
      assert.equal(deps.staffServiceEmails, root.service.emails);

      const replacement = {};
      sandbox.stub(root, 'service').get(() => ({ emails: replacement }));
      assert.equal(deps.staffServiceEmails, replacement);
    }

    it('gives Stripe donation checkout the staff emails read at each access', function () {
      const stripe = require('../../../../../core/server/services/stripe');

      assertReadOnEachAccess(stripe.webhookController.checkoutSessionEventService.deps);
    });

    it('gives Gifts the staff emails read at each access', function () {
      const gifts = require('../../../../../core/server/services/gifts');
      gifts.init({
        apiUrl: 'https://site.example/ghost/api/admin/',
        schedulerAdapter: { register: sandbox.stub() },
        internalKeys: {},
        checkouts: { read: sandbox.stub() },
      });

      assertReadOnEachAccess((gifts.service as { deps: { staffServiceEmails: unknown } }).deps);
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
      openServices();
      const event = await reachMembersMilestone();
      assert.ok(event instanceof MilestoneCreatedEvent);
      assert.ok(event.data.milestone instanceof Milestone);

      await publish(event);

      sinon.assert.calledOnce(send);
      assert.equal(send.firstCall.args[0].to, 'owner@site.example');
      assert.equal(send.firstCall.args[0].subject, 'Staff Site now has 1,000 members');
    });

    it('does not mail a saved milestone suppressed by a recent import', async function () {
      hasImportedMembers = true;
      openServices();
      const event = await reachMembersMilestone();
      // The production entity carries the reason beside the milestone, not on it.
      assert.equal(event.data.meta.reason, 'import');
      assert.equal((event.data.milestone as { meta?: unknown }).meta, undefined);

      await publish(event);

      sinon.assert.notCalled(send);
    });

    it('gates delivery on emailSentAt and ignores a reason carried beside the milestone', async function () {
      // Pinned as current behaviour: Staff reads milestone.meta.reason, which the
      // entity never has. Production only attaches a reason when emailSentAt is
      // null, so this combination does not occur from MilestonesService today.
      openServices();
      const milestone = await Milestone.create({
        type: 'members',
        value: 1000,
        emailSentAt: new Date(),
        meta: { reason: 'import' },
      });
      const [event] = milestone.events;
      assert.equal(event.data.meta.reason, 'import');

      await publish(event);

      sinon.assert.calledOnce(send);
    });
  });
});
