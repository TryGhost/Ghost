const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const db = require('../../../../core/server/data/db');
const models = require('../../../../core/server/models');
const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');
const {
  EmailOpenedEvent,
} = require('../../../../core/server/services/email-service/events/email-opened-event');

describe('Newsletter event flush', function () {
  let recipient;
  let storage;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
    recipient = fixtureManager.get('email_recipients', 0);
  });

  beforeEach(async function () {
    await models.EmailRecipient.edit({ opened_at: null }, { id: recipient.id });
    storage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models,
    });
  });

  it('returns only the first open transition when events are duplicated and replayed', async function () {
    const firstOpen = new Date('2026-09-01T12:00:00.000Z');
    const event = (timestamp) =>
      EmailOpenedEvent.create({
        email: recipient.member_email,
        emailRecipientId: recipient.id,
        emailId: recipient.email_id,
        memberId: recipient.member_id,
        timestamp,
      });

    await storage.handleOpened(event(new Date('2026-09-01T12:01:00.000Z')));
    await storage.handleOpened(event(firstOpen));

    assert.deepEqual(await storage.flushBatchedUpdates(), [
      {
        emailId: recipient.email_id,
        delivered: [],
        opened: [{ recipientId: recipient.id, memberId: recipient.member_id }],
        failed: [],
      },
    ]);
    const saved = await models.EmailRecipient.findOne({ id: recipient.id }, { require: true });
    assert.equal(saved.get('opened_at').toISOString(), firstOpen.toISOString());

    await storage.handleOpened(event(firstOpen));
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
  });
});
