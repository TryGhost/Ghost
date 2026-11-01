const sinon = require('sinon');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const assert = require('node:assert/strict');
const DomainEvents = require('@tryghost/domain-events');
const ObjectId = require('bson-objectid').default;
const { randomUUID } = require('node:crypto');

const MailgunClient = require('../../../core/server/lib/mailgun/mailgun-client');
const emailAnalytics = require('../../../core/server/services/email-analytics');
const models = require('../../../core/server/models');

describe('MailgunEmailSuppressionList', function () {
  let agent;
  let events = [];

  beforeAll(async function () {
    // Pin the email-analytics fetch window to an old date before boot, so the
    // year-2000 test events below fall inside it. Without this the window
    // starts at ~now and the events (being "too close to NOW") are never
    // fetched, so no suppression is created. The suite previously passed only
    // by free-riding on an earlier file's timestamp state, which breaks under
    // per-file isolation. Mirrors newsletter-email-event-storage.test.js.
    const { Queries } = require('../../../core/server/services/email-analytics/lib/queries');
    sinon.stub(Queries.prototype, 'getLastEventTimestamp').callsFake(async function () {
      return new Date(2000, 0, 1);
    });

    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails:failed');
    await agent.loginAsOwner();

    sinon.stub(MailgunClient.prototype, 'fetchEvents').callsFake(async function (_, batchHandler) {
      const normalizedEvents = (events.map(this.normalizeEvent) || []).filter((e) => !!e);
      return [await batchHandler(normalizedEvents)];
    });
  });

  afterAll(function () {
    sinon.restore();
  });

  it('Members retains the ready suppression list', async function () {
    // Members captures the ready instance when its API is built during boot.
    const membersService = require('../../../core/server/services/members');
    const emailSuppressionList = require('../../../core/server/services/email-suppression-list')
      .default.service;

    assert.equal(membersService.api.memberBREADService.emailSuppressionList, emailSuppressionList);
  });

  it('Can handle permanent failure events with an error code of 605', async function () {
    const emailBatch = fixtureManager.get('email_batches', 0);

    const emailRecipient = fixtureManager.get('email_recipients', 0);
    assert(emailRecipient.batch_id === emailBatch.id);
    const memberId = emailRecipient.member_id;
    const providerId = emailBatch.mailgun_message_id;
    const timestamp = new Date(2000, 0, 1);
    const recipient = emailRecipient.member_email;

    const {
      body: {
        members: [member],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      member.email_suppression.suppressed,
      false,
      'This test requires a member that does not have a suppressed email',
    );

    events = [
      createPermanentFailedEvent({
        errorCode: 605,
        providerId,
        timestamp,
        recipient,
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const {
      body: {
        members: [memberAfter],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      memberAfter.email_suppression.suppressed,
      true,
      'The member should have a suppressed email',
    );
    assert.equal(memberAfter.email_suppression.info.reason, 'fail');
  });

  it('Can handle permanent failure events with an error code of 607', async function () {
    const emailBatch = fixtureManager.get('email_batches', 0);

    const emailRecipient = fixtureManager.get('email_recipients', 1);
    assert(emailRecipient.batch_id === emailBatch.id);
    const memberId = emailRecipient.member_id;
    const providerId = emailBatch.mailgun_message_id;
    const timestamp = new Date(2000, 0, 1);
    const recipient = emailRecipient.member_email;

    const {
      body: {
        members: [member],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      member.email_suppression.suppressed,
      false,
      'This test requires a member that does not have a suppressed email',
    );

    events = [
      createPermanentFailedEvent({
        errorCode: 607,
        providerId,
        timestamp,
        recipient,
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const {
      body: {
        members: [memberAfter],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      memberAfter.email_suppression.suppressed,
      true,
      'The member should have a suppressed email',
    );
    assert.equal(memberAfter.email_suppression.info.reason, 'fail');
  });

  it('Can handle permanent failure events with an error code of 4xx', async function () {
    const emailBatch = fixtureManager.get('email_batches', 0);

    const emailRecipient = fixtureManager.get('email_recipients', 2);
    assert(emailRecipient.batch_id === emailBatch.id);
    const memberId = emailRecipient.member_id;
    const providerId = emailBatch.mailgun_message_id;
    const timestamp = new Date(2000, 0, 1);
    const recipient = emailRecipient.member_email;

    const {
      body: {
        members: [member],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      member.email_suppression.suppressed,
      false,
      'This test requires a member that does not have a suppressed email',
    );

    events = [
      createPermanentFailedEvent({
        errorCode: 400 + Math.floor(Math.random() * 100), // Random number between 400-499
        providerId,
        timestamp,
        recipient,
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const {
      body: {
        members: [memberAfter],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      memberAfter.email_suppression.suppressed,
      false,
      'The member should not have a suppressed email',
    );
    assert.equal(memberAfter.email_suppression.info, null);
  });

  it('Can handle permanent failure events with an error code of 5xx', async function () {
    const emailBatch = fixtureManager.get('email_batches', 0);

    const emailRecipient = fixtureManager.get('email_recipients', 3);
    assert(emailRecipient.batch_id === emailBatch.id);
    const memberId = emailRecipient.member_id;
    const providerId = emailBatch.mailgun_message_id;
    const timestamp = new Date(2000, 0, 1);
    const recipient = emailRecipient.member_email;

    const {
      body: {
        members: [member],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      member.email_suppression.suppressed,
      false,
      'This test requires a member that does not have a suppressed email',
    );

    events = [
      createPermanentFailedEvent({
        errorCode: 500 + Math.floor(Math.random() * 100), // Random number between 500-599
        providerId,
        timestamp,
        recipient,
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const {
      body: {
        members: [memberAfter],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      memberAfter.email_suppression.suppressed,
      false,
      'The member should not have a suppressed email',
    );
    assert.equal(memberAfter.email_suppression.info, null);
  });

  it('Can handle complaint events', async function () {
    const emailBatch = fixtureManager.get('email_batches', 0);
    const emailId = emailBatch.email_id;

    const emailRecipient = fixtureManager.get('email_recipients', 4);
    assert(emailRecipient.batch_id === emailBatch.id);
    const memberId = emailRecipient.member_id;
    const providerId = emailBatch.mailgun_message_id;
    const timestamp = new Date(2000, 0, 1);

    const {
      body: {
        members: [member],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      member.email_suppression.suppressed,
      false,
      'This test requires a member that does not have a suppressed email',
    );

    events = [
      {
        event: 'complained',
        recipient: emailRecipient.member_email,
        'user-variables': {
          'email-id': emailId,
        },
        message: {
          headers: {
            'message-id': providerId,
          },
        },
        timestamp: Math.round(timestamp.getTime() / 1000),
      },
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const {
      body: {
        members: [memberAfter],
      },
    } = await agent.get(`/members/${memberId}`);
    assert.equal(
      memberAfter.email_suppression.suppressed,
      true,
      'The member should have a suppressed email',
    );
    assert.equal(memberAfter.email_suppression.info.reason, 'spam');
  });

  it('Sets email_disabled on the member when a suppression record already exists (ONC-1640)', async function () {
    // Regression test: if a Suppression record already exists for the address
    // (e.g. from a deleted previous member), a bounce event for a new member
    // with the same address used to silently ER_DUP_ENTRY and never dispatch
    // EmailSuppressedEvent, leaving the member with email_disabled=false forever.
    const emailBatch = fixtureManager.get('email_batches', 0);
    const emailRecipient = fixtureManager.get('email_recipients', 5);
    assert(emailRecipient.batch_id === emailBatch.id);
    const memberId = emailRecipient.member_id;
    const providerId = emailBatch.mailgun_message_id;
    const recipient = emailRecipient.member_email;
    const timestamp = new Date(2000, 0, 1);

    await models.Suppression.add({
      email: recipient,
      email_id: emailBatch.email_id,
      reason: 'bounce',
      created_at: new Date(1999, 0, 1),
    });

    const memberBefore = await models.Member.findOne({ id: memberId }, { require: true });
    assert.equal(
      memberBefore.get('email_disabled'),
      false,
      'Test setup: the member should start with email_disabled=false',
    );

    events = [
      createPermanentFailedEvent({
        errorCode: 605,
        providerId,
        timestamp,
        recipient,
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const memberAfter = await models.Member.findOne({ id: memberId }, { require: true });
    assert.equal(
      memberAfter.get('email_disabled'),
      true,
      'Member should be disabled even when the Suppression record already existed',
    );

    // Clean up so subsequent tests using this email aren't affected
    await models.Suppression.destroy({ destroyBy: { email: recipient } });
  });

  it('Suppresses an address after repeated permanent failures for an invalid recipient', async function () {
    const member = await addMember('repeatedly-rejected@example.com');
    await addSentEmail(member, {
      sentAt: new Date(2000, 0, 1),
      failure: { code: 498, message: 'No MX for example.com' },
    });
    await addSentEmail(member, {
      sentAt: new Date(2000, 0, 2),
      failure: { code: 550, message: '#5.1.0 Address rejected.' },
    });
    const latest = await addSentEmail(member, { sentAt: new Date(2000, 0, 3) });

    events = [
      createPermanentFailedEvent({
        errorCode: 550,
        enhancedCode: '5.1.1',
        description: '5.1.1 The email account that you tried to reach does not exist.',
        providerId: latest.providerId,
        timestamp: new Date(2000, 0, 3),
        recipient: member.get('email'),
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const memberAfter = await models.Member.findOne({ id: member.id }, { require: true });
    assert.equal(memberAfter.get('email_disabled'), true);
    const suppression = await models.Suppression.findOne({ email: member.get('email') });
    assert.equal(suppression.get('reason'), 'bounce');
  });

  it('Does not suppress an address after repeated policy rejections', async function () {
    const member = await addMember('repeatedly-blocked@example.com');
    await addSentEmail(member, {
      sentAt: new Date(2000, 0, 1),
      failure: { code: 550, message: '#5.1.0 Address rejected.' },
    });
    await addSentEmail(member, {
      sentAt: new Date(2000, 0, 2),
      failure: { code: 554, enhancedCode: '5.7.1', message: '5.7.1 Message rejected as spam' },
    });
    const latest = await addSentEmail(member, { sentAt: new Date(2000, 0, 3) });

    events = [
      createPermanentFailedEvent({
        errorCode: 550,
        enhancedCode: '5.1.1',
        description: '5.1.1 User unknown',
        providerId: latest.providerId,
        timestamp: new Date(2000, 0, 3),
        recipient: member.get('email'),
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const memberAfter = await models.Member.findOne({ id: member.id }, { require: true });
    assert.equal(memberAfter.get('email_disabled'), false);
    assert.equal(await models.Suppression.findOne({ email: member.get('email') }), null);
  });

  it('Does not suppress an address that received an email since its last invalid recipient failure', async function () {
    const member = await addMember('recovered@example.com');
    await addSentEmail(member, {
      sentAt: new Date(2000, 0, 1),
      failure: { code: 550, message: '#5.1.0 Address rejected.' },
    });
    await addSentEmail(member, { sentAt: new Date(2000, 0, 2), delivered: true });
    await addSentEmail(member, {
      sentAt: new Date(2000, 0, 3),
      failure: { code: 550, message: '550 5.1.1 User unknown' },
    });
    const latest = await addSentEmail(member, { sentAt: new Date(2000, 0, 4) });

    events = [
      createPermanentFailedEvent({
        errorCode: 550,
        enhancedCode: '5.1.1',
        description: '5.1.1 User unknown',
        providerId: latest.providerId,
        timestamp: new Date(2000, 0, 4),
        recipient: member.get('email'),
      }),
    ];

    await emailAnalytics.getNewsletters().fetchLatestOpenedEvents();
    await DomainEvents.allSettled();

    const memberAfter = await models.Member.findOne({ id: member.id }, { require: true });
    assert.equal(memberAfter.get('email_disabled'), false);
    assert.equal(await models.Suppression.findOne({ email: member.get('email') }), null);
  });
});

async function addMember(email) {
  return await models.Member.add({
    email,
    status: 'free',
    newsletters: [{ id: fixtureManager.get('newsletters', 0).id }],
    email_disabled: false,
  });
}

async function addSentEmail(member, { sentAt, failure, delivered = false }) {
  const knex = models.Base.knex;
  const emailId = ObjectId().toHexString();
  const batchId = ObjectId().toHexString();
  const emailRecipientId = ObjectId().toHexString();
  const providerId = `${batchId}@testing.mailgun.net`;

  await knex('emails').insert({
    id: emailId,
    post_id: ObjectId().toHexString(),
    uuid: randomUUID(),
    status: 'submitted',
    recipient_filter: 'all',
    submitted_at: sentAt,
    newsletter_id: fixtureManager.get('newsletters', 0).id,
    created_at: sentAt,
  });
  await knex('email_batches').insert({
    id: batchId,
    email_id: emailId,
    mailgun_message_id: providerId,
    status: 'submitted',
    created_at: sentAt,
    updated_at: sentAt,
  });
  await knex('email_recipients').insert({
    id: emailRecipientId,
    email_id: emailId,
    member_id: member.id,
    batch_id: batchId,
    processed_at: sentAt,
    delivered_at: delivered ? sentAt : null,
    failed_at: failure ? sentAt : null,
    member_uuid: member.get('uuid'),
    member_email: member.get('email'),
  });
  if (failure) {
    await knex('email_recipient_failures').insert({
      id: ObjectId().toHexString(),
      email_id: emailId,
      member_id: member.id,
      email_recipient_id: emailRecipientId,
      code: failure.code,
      enhanced_code: failure.enhancedCode ?? null,
      message: failure.message,
      severity: 'permanent',
      failed_at: sentAt,
    });
  }

  return { providerId };
}

function createPermanentFailedEvent({
  errorCode,
  enhancedCode,
  description = 'Not delivering to previously bounced address',
  providerId,
  timestamp,
  recipient,
}) {
  return {
    event: 'failed',
    id: 'pl271FzxTTmGRW8Uj3dUWw',
    'log-level': 'error',
    severity: 'permanent',
    reason: 'suppress-bounce',
    envelope: {
      sender: 'john@example.org',
      transport: 'smtp',
      targets: 'joan@example.com',
    },
    flags: {
      'is-routed': false,
      'is-authenticated': true,
      'is-system-test': false,
      'is-test-mode': false,
    },
    'delivery-status': {
      'attempt-no': 1,
      message: '',
      code: errorCode,
      'enhanced-code': enhancedCode,
      description,
      'session-seconds': 0.0,
    },
    message: {
      headers: {
        to: 'joan@example.com',
        'message-id': providerId,
        from: 'john@example.org',
        subject: 'Test Subject',
      },
      attachments: [],
      size: 867,
    },
    storage: {
      url: 'https://se.api.mailgun.net/v3/domains/example.org/messages/eyJwI...',
      key: 'eyJwI...',
    },
    recipient: recipient,
    'recipient-domain': 'mailgun.com',
    campaigns: [],
    tags: [],
    'user-variables': {},
    timestamp: Math.round(timestamp.getTime() / 1000),
  };
}
