import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import * as configUtils from '../../../../utils/config-utils';

const DomainEvents = require('@tryghost/domain-events');
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
const staffRoot = require('../../../../../core/server/services/staff');

type Handler = (event: unknown) => Promise<void>;
type Recipient = { email: string; slug: string };
type Emails = {
  mailer: unknown;
  renderHTML: (template: string, data: unknown) => Promise<string>;
  renderText: (template: string, data: unknown) => Promise<string>;
  notifyFreeMemberSignup: (data: unknown, options?: unknown) => Promise<void>;
  notifyPaidSubscriptionStarted: (data: unknown, options?: unknown) => Promise<void>;
  notifyPaidSubscriptionCanceled: (data: unknown, options?: unknown) => Promise<void>;
  notifyMilestoneReceived: (data: unknown) => Promise<void>;
  notifyDonationReceived: (data: unknown) => Promise<void>;
  getMemberData: (member: unknown) => { createdAt: string | null };
};

const OWNER = { email: 'owner@site.example', slug: 'owner' };
const ADMIN = { email: 'admin@site.example', slug: 'admin' };
const MEMBER = {
  id: 'member-1',
  name: 'Jamie',
  email: 'jamie@example.com',
  status: 'free',
  geolocation: null,
  created_at: '2022-08-01T12:00:00.000Z',
};
const SUBSCRIPTION = {
  id: 'sub-1',
  plan: { amount: 5000, currency: 'USD', interval: 'month' },
  start_date: '2022-08-01T12:00:00.000Z',
  current_period_end: '2024-08-01T12:00:00.000Z',
  cancellation_reason: null,
};

function donation() {
  return {
    donationPaymentEvent: {
      amount: 1500,
      currency: 'usd',
      name: 'Simon',
      email: 'simon@example.com',
      memberId: null,
      donationMessage: null,
    },
  };
}

function row(json: unknown) {
  return json ? { toJSON: () => json } : null;
}

describe('Staff notifications', function () {
  const sandbox = sinon.createSandbox();
  let subscribe: sinon.SinonStub;
  let send: sinon.SinonStub;
  let warn: sinon.SinonStub;
  let error: sinon.SinonStub;
  let getSetting: sinon.SinonStub;
  let getDefaultEmail: sinon.SinonStub;
  let getEmailAlertUsers: sinon.SinonStub;
  let findMember: sinon.SinonStub;
  let findSubscription: sinon.SinonStub;
  let attribution: Record<string, sinon.SinonStub>;
  let root: { init(): void; api: { emails: Emails } };
  let emails: Emails;

  beforeEach(function () {
    configUtils.set('mail', { transport: 'direct' });
    subscribe = sandbox.stub(DomainEvents, 'subscribe');
    send = sandbox.stub(mail.GhostMailer.prototype, 'send').resolves({});
    warn = sandbox.stub(logging, 'warn');
    error = sandbox.stub(logging, 'error');
    attribution = {
      getMemberCreatedAttribution: sandbox.stub().resolves(null),
      getSubscriptionCreatedAttribution: sandbox.stub().resolves(null),
      fetchResource: sandbox
        .stub()
        .resolves({ title: 'Welcome post', url: '/welcome/', referrerSource: 'Direct' }),
    };
    sandbox.stub(memberAttribution, 'service').get(() => attribution);
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('title').returns('First Title');
    getSetting.withArgs('accent_color').returns('#123456');
    getDefaultEmail = sandbox
      .stub(settingsHelpers, 'getDefaultEmail')
      .returns({ address: 'first@site.example', name: 'First Sender' });
    sandbox.stub(urlUtils, 'getSiteUrl').returns('https://site.example/');
    sandbox.stub(urlUtils, 'urlFor').withArgs('admin', true).returns('https://site.example/ghost/');
    sandbox.stub(blogIcon, 'getIconUrl').returns('https://site.example/favicon.png');
    getEmailAlertUsers = sandbox.stub(models.User, 'getEmailAlertUsers').resolves([OWNER]);
    findMember = sandbox.stub(models.Member, 'findOne').resolves(row(MEMBER));
    sandbox.stub(models.Product, 'findOne').resolves(row({ id: 'tier-1', name: 'Gold' }));
    findSubscription = sandbox
      .stub(models.StripeCustomerSubscription, 'findOne')
      .resolves(row(SUBSCRIPTION));
    sandbox.stub(models.Offer, 'findOne').resolves(null);

    // A wrapper of the same class as the exported singleton, so these cases never
    // depend on, or change, the root other files in this worker have initialized.
    root = new staffRoot.constructor();
    root.init();
    emails = root.api.emails;
  });

  afterEach(async function () {
    sandbox.restore();
    await configUtils.restore();
  });

  function handlerFor(Event: unknown): Handler {
    const call = subscribe.getCalls().find((candidate) => candidate.args[0] === Event);
    assert.ok(call, `no handler subscribed for ${String(Event)}`);
    return call.args[1];
  }

  // Holds the first delivery open and reports when it has started.
  function holdFirstSend() {
    const delivery = Promise.withResolvers<void>();
    const sending = Promise.withResolvers<void>();
    send.onFirstCall().callsFake(() => {
      sending.resolve();
      return delivery.promise;
    });
    return { delivery, started: sending.promise };
  }

  function sentTo(): string[] {
    return send.getCalls().map((call) => call.args[0].to);
  }

  describe('captured and live configuration on one instance', function () {
    it('keeps the transport chosen when the mailer was built after mail config changes', async function () {
      configUtils.set('mail', { transport: 'SMTP', options: {} });

      await emails.notifyDonationReceived(donation());

      sinon.assert.calledOnce(send);
      const mailer = send.firstCall.thisValue as { state: unknown };
      assert.equal(mailer, emails.mailer);
      assert.deepEqual(mailer.state, { usingDirect: true, usingMailgun: false, usingSmtp: false });
    });

    it('reads the sender, site title and accent colour again for each notification', async function () {
      await emails.notifyDonationReceived(donation());
      getDefaultEmail.returns({ address: 'second@site.example', name: 'Second Sender' });
      getSetting.withArgs('title').returns('Second Title');
      getSetting.withArgs('accent_color').returns('#abcdef');
      await emails.notifyDonationReceived(donation());

      const [first, second] = send.getCalls().map((call) => call.args[0]);
      assert.equal(first.from, '"First Sender" <first@site.example>');
      assert.equal(second.from, '"Second Sender" <second@site.example>');
      assert.ok(first.html.includes('First Title'));
      assert.ok(first.html.includes('#123456'));
      assert.ok(second.html.includes('Second Title'));
      assert.ok(second.html.includes('#abcdef'));
      assert.equal(first.forceTextContent, true);
    });

    it('reads the sender for each recipient while an earlier delivery is pending', async function () {
      getEmailAlertUsers.resolves([OWNER, ADMIN]);
      const { delivery, started } = holdFirstSend();
      const notification = emails.notifyFreeMemberSignup({ member: MEMBER });

      try {
        await started;
        await setImmediate();
        sinon.assert.calledOnce(send);
        getDefaultEmail.returns({ address: 'second@site.example', name: 'Second Sender' });
      } finally {
        delivery.resolve();
        await notification;
      }

      assert.deepEqual(sentTo(), [OWNER.email, ADMIN.email]);
      assert.equal(send.firstCall.args[0].from, '"First Sender" <first@site.example>');
      assert.equal(send.secondCall.args[0].from, '"Second Sender" <second@site.example>');
    });

    it('reads recipient preferences once per notification, so a pending notification keeps its list', async function () {
      const { delivery, started } = holdFirstSend();
      const pending = emails.notifyDonationReceived(donation());
      await started;
      getEmailAlertUsers.resolves([ADMIN]);

      const later = emails.notifyDonationReceived(donation());
      try {
        await later;
      } finally {
        delivery.resolve();
        await pending;
      }

      assert.deepEqual(getEmailAlertUsers.args, [['donation'], ['donation']]);
      assert.deepEqual(sentTo(), [OWNER.email, ADMIN.email]);
    });

    it('passes the event caller options to recipient lookup for member notifications', async function () {
      const options = { transacting: {}, forUpdate: true };
      await emails.notifyFreeMemberSignup({ member: MEMBER }, options);

      sinon.assert.calledOnceWithExactly(getEmailAlertUsers, 'free-signup', options);
    });
  });

  describe('multiple recipients', function () {
    it('sends to each recipient in order with their own settings link', async function () {
      getEmailAlertUsers.resolves([OWNER, ADMIN]);

      await emails.notifyFreeMemberSignup({ member: MEMBER });

      assert.deepEqual(sentTo(), [OWNER.email, ADMIN.email]);
      assert.ok(
        send.firstCall.args[0].html.includes(
          'https://site.example/ghost/#/settings/staff/owner/email-notifications',
        ),
      );
      assert.ok(
        send.secondCall.args[0].html.includes(
          'https://site.example/ghost/#/settings/staff/admin/email-notifications',
        ),
      );
    });

    it('stops a member notification at the first failed send and rejects with it', async function () {
      getEmailAlertUsers.resolves([OWNER, ADMIN]);
      const failure = new Error('SMTP down');
      send.onFirstCall().rejects(failure);

      await assert.rejects(
        emails.notifyFreeMemberSignup({ member: MEMBER }),
        (rejection) => rejection === failure,
      );

      assert.deepEqual(sentTo(), [OWNER.email]);
    });

    for (const [name, notify] of [
      ['donation', (target: Emails) => target.notifyDonationReceived(donation())],
      [
        'milestone',
        (target: Emails) =>
          target.notifyMilestoneReceived({
            milestone: { type: 'members', value: 1000, emailSentAt: new Date() },
          }),
      ],
    ] as const) {
      it(`stops the ${name} loop at the first awaited send failure before its allSettled warning`, async function () {
        // Pinned as current behaviour: each send is awaited before it is pushed,
        // so Promise.allSettled never sees a rejection and later recipients are skipped.
        getEmailAlertUsers.resolves([OWNER, ADMIN]);
        const failure = new Error('SMTP down');
        send.onFirstCall().rejects(failure);

        await assert.rejects(notify(emails), (rejection) => rejection === failure);

        assert.deepEqual(sentTo(), [OWNER.email]);
        sinon.assert.neverCalledWith(warn, failure);
      });
    }
  });

  describe('event handlers', function () {
    const created = () => MemberCreatedEvent.create({ source: 'member', memberId: 'member-1' });
    const activated = (data = {}) =>
      SubscriptionActivatedEvent.create({
        source: 'member',
        memberId: 'member-1',
        tierId: 'tier-1',
        subscriptionId: 'sub-1',
        ...data,
      });
    const cancelled = () =>
      SubscriptionCancelledEvent.create({
        source: 'member',
        memberId: 'member-1',
        tierId: 'tier-1',
        subscriptionId: 'sub-1',
      });
    const milestone = () =>
      MilestoneCreatedEvent.create({
        milestone: { type: 'members', value: 1000, emailSentAt: new Date() },
      });

    for (const [Event, createEvent, message] of [
      [MemberCreatedEvent, created, 'Failed to notify free member signup - member-1'],
      [
        SubscriptionActivatedEvent,
        activated,
        'Failed to notify paid member subscription start - member-1',
      ],
      [
        SubscriptionCancelledEvent,
        cancelled,
        'Failed to notify paid member subscription cancel - member-1',
      ],
      [MilestoneCreatedEvent, milestone, 'Failed to notify milestone'],
    ] as const) {
      it(`logs a failed ${Event.name} notification without rejecting`, async function () {
        const failure = new Error('SMTP down');
        send.rejects(failure);

        await handlerFor(Event)(createEvent());

        sinon.assert.calledOnceWithExactly(error, failure, message);
      });
    }

    it('aborts the signup notification when supplied attribution cannot be resolved', async function () {
      const failure = new Error('resource lookup failed');
      attribution.fetchResource.rejects(failure);

      await handlerFor(MemberCreatedEvent)(
        MemberCreatedEvent.create({
          source: 'member',
          memberId: 'member-1',
          attribution: { id: 'post-1', type: 'post' },
        }),
      );

      sinon.assert.notCalled(attribution.getMemberCreatedAttribution);
      sinon.assert.notCalled(send);
      sinon.assert.calledOnceWithExactly(
        error,
        failure,
        'Failed to notify free member signup - member-1',
      );
    });

    it('sends the signup notification without attribution when the historical lookup fails', async function () {
      attribution.getMemberCreatedAttribution.rejects(new Error('history unavailable'));

      await handlerFor(MemberCreatedEvent)(created());

      sinon.assert.calledOnceWithExactly(attribution.getMemberCreatedAttribution, 'member-1');
      sinon.assert.calledWith(warn, 'Failed to get attribution for member - member-1');
      sinon.assert.calledOnce(send);
      assert.equal(send.firstCall.args[0].subject, '🥳 Free member signup: Jamie');
      sinon.assert.notCalled(error);
    });

    it('aborts the paid start notification when supplied attribution cannot be resolved', async function () {
      const failure = new Error('resource lookup failed');
      attribution.fetchResource.rejects(failure);

      await handlerFor(SubscriptionActivatedEvent)(
        activated({ attribution: { id: 'post-1', type: 'post' } }),
      );

      sinon.assert.notCalled(attribution.getSubscriptionCreatedAttribution);
      sinon.assert.notCalled(send);
      sinon.assert.calledOnceWithExactly(
        error,
        failure,
        'Failed to notify paid member subscription start - member-1',
      );
    });

    it('sends the paid start notification without attribution when the historical lookup fails', async function () {
      attribution.getSubscriptionCreatedAttribution.rejects(new Error('history unavailable'));

      await handlerFor(SubscriptionActivatedEvent)(activated());

      sinon.assert.calledOnceWithExactly(attribution.getSubscriptionCreatedAttribution, 'sub-1');
      sinon.assert.calledWith(warn, 'Failed to get attribution for member - member-1');
      sinon.assert.calledOnce(send);
      assert.equal(send.firstCall.args[0].subject, '💸 Paid subscription started: Jamie');
      sinon.assert.notCalled(error);
    });

    it('uses supplied attribution instead of the historical lookup', async function () {
      await handlerFor(MemberCreatedEvent)(
        MemberCreatedEvent.create({
          source: 'member',
          memberId: 'member-1',
          attribution: { id: 'post-1', type: 'post' },
        }),
      );

      sinon.assert.calledOnceWithExactly(attribution.fetchResource, { id: 'post-1', type: 'post' });
      sinon.assert.notCalled(attribution.getMemberCreatedAttribution);
      assert.ok(send.firstCall.args[0].html.includes('Welcome post'));
    });

    for (const [description, Event, createEvent, message, missing] of [
      [
        'the member',
        MemberCreatedEvent,
        created,
        'Failed to notify free member signup - member-1',
        () => findMember.resolves(null),
      ],
      [
        'the subscription of a started subscription',
        SubscriptionActivatedEvent,
        activated,
        'Failed to notify paid member subscription start - member-1',
        () => findSubscription.resolves(null),
      ],
      [
        'the subscription of a cancelled subscription',
        SubscriptionCancelledEvent,
        cancelled,
        'Failed to notify paid member subscription cancel - member-1',
        () => findSubscription.resolves(null),
      ],
    ] as const) {
      it(`logs a TypeError and sends nothing when ${description} is missing`, async function () {
        missing();

        await handlerFor(Event)(createEvent());

        sinon.assert.notCalled(send);
        sinon.assert.calledOnceWithExactly(error, sinon.match.instanceOf(TypeError), message);
      });
    }

    it('logs a template failure and sends nothing', async function () {
      const failure = new Error('template unavailable');
      sandbox.stub(emails, 'renderHTML').rejects(failure);

      await handlerFor(MemberCreatedEvent)(created());

      sinon.assert.notCalled(send);
      sinon.assert.calledOnceWithExactly(
        error,
        failure,
        'Failed to notify free member signup - member-1',
      );
    });
  });

  describe('rendering', function () {
    it('rejects an unknown HTML or text template without sending', async function () {
      await assert.rejects(emails.renderHTML('not-a-template', {}));
      await assert.rejects(emails.renderText('not-a-template', {}));

      sinon.assert.notCalled(send);
    });

    it('formats member, expiry and trial dates in day month year form', async function () {
      sandbox.useFakeTimers({ now: Date.parse('2022-08-01T12:00:00.000Z'), toFake: ['Date'] });

      assert.equal(emails.getMemberData(MEMBER).createdAt, '1 Aug 2022');

      await emails.notifyPaidSubscriptionCanceled({
        member: MEMBER,
        tier: { name: 'Gold' },
        subscription: { amount: 5000, currency: 'USD', interval: 'month' },
        expiryAt: '2024-08-01T12:00:00.000Z',
        cancelNow: false,
      });
      assert.ok(send.lastCall.args[0].html.includes('>1 Aug 2024</p>'));

      // Without a trial start, the trial length counts from now, not from the start date.
      await emails.notifyPaidSubscriptionStarted({
        member: MEMBER,
        tier: { name: 'Gold' },
        subscription: {
          amount: 5000,
          currency: 'USD',
          interval: 'month',
          startDate: '2022-07-25T12:00:00.000Z',
          trialEnd: '2022-08-15T12:00:00.000Z',
        },
      });
      assert.ok(send.lastCall.args[0].html.includes('14 days free'));
    });
  });
});
