import ObjectId from 'bson-objectid';
import assert from 'node:assert/strict';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

// @ts-expect-error Module has no type declarations.
import models from '../../../core/server/models';

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

const EMAIL_TABLES = [
  'email_batches',
  'email_recipients',
  'email_recipient_failures',
  'email_spam_complaint_events',
] as const;

// The emails host limit counts sends from these rows, so deleting a post can't reset it
describe('Deleting a sent post', function () {
  let agent: Agent;
  let email: { id: string; post_id: string };

  const emailData = async (emailId: string) => {
    const knex = models.Base.knex;
    const row = await knex('emails').where('id', emailId).first();
    const counts: Record<string, number> = {};
    for (const table of EMAIL_TABLES) {
      const { count } = await knex(table)
        .where('email_id', emailId)
        .count('id', { as: 'count' })
        .first();
      counts[table] = Number(count);
    }
    const suppression = await knex('suppressions').where('email_id', emailId).first();

    return { emailCount: row?.email_count, counts, suppressed: Boolean(suppression) };
  };

  // Fresh fixtures per test: there's a single fixture email with recipients
  beforeEach(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init(
      'posts',
      'newsletters',
      'members:newsletters',
      'members:emails:failed',
    );
    await agent.loginAsOwner();

    const knex = models.Base.knex;
    email = await knex('emails as e')
      .join('email_recipients as er', 'er.email_id', 'e.id')
      .join('email_recipient_failures as erf', 'erf.email_id', 'e.id')
      .select('e.id', 'e.post_id')
      .first();
    assert.ok(email, 'Expected a fixture email with recipients and failures');

    // Fixtures have no spam complaints or suppressions, so add one of each for this email
    const recipient = await knex('email_recipients').where('email_id', email.id).first();
    const now = new Date();
    await knex('email_spam_complaint_events').insert({
      id: ObjectId().toHexString(),
      email_id: email.id,
      member_id: recipient.member_id,
      email_address: recipient.member_email,
      created_at: now,
    });
    await knex('suppressions').insert({
      id: ObjectId().toHexString(),
      email: recipient.member_email,
      email_id: email.id,
      reason: 'spam',
      created_at: now,
    });
  });

  const assertEmailDataKept = async (deletePost: () => Promise<unknown>) => {
    const before = await emailData(email.id);
    for (const table of EMAIL_TABLES) {
      assert.ok(before.counts[table] > 0, `Expected fixture rows in ${table}`);
    }
    assert.ok(before.suppressed);

    await deletePost();

    assert.equal(await models.Base.knex('posts').where('id', email.post_id).first(), undefined);
    assert.deepEqual(await emailData(email.id), before);
  };

  it('keeps the email data when the post is deleted on its own', async function () {
    await assertEmailDataKept(() => agent.delete(`/posts/${email.post_id}/`).expectStatus(204));
  });

  it('keeps the email data when the post is bulk deleted', async function () {
    await assertEmailDataKept(() =>
      agent
        .delete(`/posts/?filter=${encodeURIComponent(`id:'${email.post_id}'`)}`)
        .expectStatus(200),
    );
  });
});
