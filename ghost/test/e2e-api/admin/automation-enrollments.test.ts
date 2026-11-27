import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ObjectId from 'bson-objectid';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
import {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} from '../../utils/automations-fixtures';
const models = require('../../../core/server/models');

const newId = () => ObjectId().toHexString();

describe('Member automation enrollments API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let memberId: string;
  let otherMemberId: string;
  let automationIds: string[];
  const db = models.Base.knex;
  const timestamp = '2026-11-18 12:00:00';

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    mockManager.mockLabsEnabled('automations');
    mockManager.mockLabsEnabled('automationsLeadMagnets');
    automationIds = (await db('automations').select('id')).map(({ id }: { id: string }) => id);
    memberId = newId();
    otherMemberId = newId();
    await db('members').insert(
      [memberId, otherMemberId].map((id) => ({
        id,
        uuid: randomUUID(),
        transient_id: newId(),
        email: `${id}@example.com`,
        created_at: timestamp,
      })),
    );
  });

  afterEach(async function () {
    mockManager.restore();
    await cleanupAutomationsFixture();
    await db('members').whereIn('id', [memberId, otherMemberId]).del();
  });

  it('returned distinct prior enrollments from Core, including runs without steps and archived automations', async function () {
    await db('automations').where('id', automationIds[1]).update({ status: 'archived' });
    await db('automation_runs').insert(
      [
        { member: memberId, automation: automationIds[0] },
        { member: memberId, automation: automationIds[0] },
        { member: memberId, automation: automationIds[1] },
      ].map(({ member, automation }) => ({
        id: newId(),
        member_id: member,
        automation_id: automation,
        member_email: 'old@example.com',
        created_at: timestamp,
        updated_at: timestamp,
      })),
    );
    const { body } = await agent
      .get(`members/${memberId}/automation-enrollments`)
      .expectStatus(200);
    assert.deepEqual(
      body.automation_enrollments
        .map(({ automation_id }: { automation_id: string }) => automation_id)
        .sort(),
      automationIds.sort(),
    );
    const empty = await agent
      .get(`members/${otherMemberId}/automation-enrollments`)
      .expectStatus(200);
    assert.deepEqual(empty.body.automation_enrollments, []);
  });

  it('required member read permission', async function () {
    await agent.loginAsAuthor();
    try {
      await agent.get(`members/${memberId}/automation-enrollments`).expectStatus(403);
    } finally {
      await agent.loginAsOwner();
    }
  });

  it('returned 404 when label automations were disabled', async function () {
    mockManager.mockLabsDisabled('automationsLeadMagnets');
    await agent.get(`members/${memberId}/automation-enrollments`).expectStatus(404);
  });
});
