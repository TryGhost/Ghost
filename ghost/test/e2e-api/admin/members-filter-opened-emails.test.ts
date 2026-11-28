import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const ObjectId = require('bson-objectid');
const models = require('../../../core/server/models');

// `opened_emails.post_id` names the post of an email a member opened: it stands for the email's
// post with the condition that the member's copy of the email was opened. Every value a filter
// gives it carries that condition, so a member who received an email without opening it never
// counts as having opened it.
/** The members the Admin API returns, as far as these tests read them. */
interface MembersResponse {
  body: { members: { id: string; uuid: string; email: string }[] };
}

/** A request of the Admin API agent, as far as these tests use it. */
interface AgentRequest {
  body(data: object): AgentRequest;
  expectStatus(status: number): Promise<MembersResponse>;
}

describe('Members filtering by the emails they opened', function () {
  let agent: {
    get: (url: string) => AgentRequest;
    post: (url: string) => AgentRequest;
    loginAsOwner: () => Promise<void>;
  };

  const FIRST_POST = ObjectId().toHexString();
  const SECOND_POST = ObjectId().toHexString();

  const OPENED_BOTH = 'opened-both@example.com';
  const OPENED_FIRST = 'opened-first@example.com';
  const OPENED_SECOND = 'opened-second@example.com';
  const RECEIVED_BOTH = 'received-both@example.com';
  const RECEIVED_NONE = 'received-none@example.com';

  async function browse(filter: string): Promise<string[]> {
    const { body } = await agent
      .get(`members/?filter=${encodeURIComponent(filter)}&limit=all`)
      .expectStatus(200);
    return body.members.map((member) => member.email).sort();
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'newsletters');
    await agent.loginAsOwner();

    const members: Record<string, { id: string; uuid: string }> = {};
    for (const email of [OPENED_BOTH, OPENED_FIRST, OPENED_SECOND, RECEIVED_BOTH, RECEIVED_NONE]) {
      const { body } = await agent
        .post('members/')
        .body({ members: [{ email, newsletters: [] }] })
        .expectStatus(201);
      members[email] = body.members[0];
    }

    const knex = models.Base.knex;
    const now = new Date();
    const emails: Record<string, { id: string; batch: string }> = {};
    for (const post of [FIRST_POST, SECOND_POST]) {
      const email = { id: ObjectId().toHexString(), batch: ObjectId().toHexString() };
      await knex('emails').insert({
        id: email.id,
        post_id: post,
        uuid: crypto.randomUUID(),
        recipient_filter: 'all',
        submitted_at: now,
        created_at: now,
      });
      await knex('email_batches').insert({
        id: email.batch,
        email_id: email.id,
        created_at: now,
        updated_at: now,
      });
      emails[post] = email;
    }

    // Who received each email, and whether they opened it
    const received: [string, string, boolean][] = [
      [OPENED_BOTH, FIRST_POST, true],
      [OPENED_BOTH, SECOND_POST, true],
      [OPENED_FIRST, FIRST_POST, true],
      [OPENED_FIRST, SECOND_POST, false],
      [OPENED_SECOND, FIRST_POST, false],
      [OPENED_SECOND, SECOND_POST, true],
      [RECEIVED_BOTH, FIRST_POST, false],
      [RECEIVED_BOTH, SECOND_POST, false],
    ];
    for (const [member, post, opened] of received) {
      await knex('email_recipients').insert({
        id: ObjectId().toHexString(),
        email_id: emails[post].id,
        batch_id: emails[post].batch,
        member_id: members[member].id,
        member_uuid: members[member].uuid,
        member_email: member,
        opened_at: opened ? now : null,
      });
    }
  });

  afterAll(async function () {
    const knex = models.Base.knex;
    await knex('email_recipients').del();
    await knex('email_batches').del();
    await knex('emails').del();
    await knex('members_newsletters').del();
    await knex('members').del();
  });

  it('matches members who opened every one of several emails', async function () {
    assert.deepEqual(await browse(`opened_emails.post_id:['${FIRST_POST}'+'${SECOND_POST}']`), [
      OPENED_BOTH,
    ]);
  });

  it('leaves out members who opened any of several emails', async function () {
    assert.deepEqual(
      await browse(
        `opened_emails.post_id:-'${FIRST_POST}'+opened_emails.post_id:-'${SECOND_POST}'`,
      ),
      [RECEIVED_BOTH, RECEIVED_NONE],
    );
  });
});
