import assert from 'node:assert/strict';
import path from 'node:path';
import sinon from 'sinon';
import type { Knex } from 'knex';
import ObjectId from 'bson-objectid';
import { knex } from '../../../core/server/data/db';
// @ts-expect-error Module has no type declarations.
import labs from '../../../core/shared/labs';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';
// @ts-expect-error Module has no type declarations.
import models from '../../../core/server/models';
import membersService from '../../../core/server/services/members';
// @ts-expect-error Module has no type declarations.
import DomainEvents from '@tryghost/domain-events';

type Member = { id: string; email: string };
type AutomationFixture = {
  id: string;
  name: string;
  automationId: string;
  actionId: string;
  revisionId: string;
};

describe('Label-added automation enrollment', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let automations: AutomationFixture[];

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    automations = [];
    sinon.stub(labs, 'isSet').callThrough().withArgs('automations').returns(true);
  });

  afterEach(async function () {
    try {
      await DomainEvents.allSettled();
      await knex.transaction(async (trx) => {
        const automationIds = automations.map((automation) => automation.automationId);
        const actionIds = automations.map((automation) => automation.actionId);
        const runIds = await trx('automation_runs')
          .whereIn('automation_id', automationIds)
          .pluck('id');
        await trx('automation_run_steps').whereIn('automation_run_id', runIds).del();
        await trx('automation_runs').whereIn('automation_id', automationIds).del();
        await trx('automation_action_revisions').whereIn('action_id', actionIds).del();
        await trx('automation_actions').whereIn('id', actionIds).del();
        await trx('automation_trigger_rules').whereIn('automation_id', automationIds).del();
        await trx('automations').whereIn('id', automationIds).del();
      });
    } finally {
      sinon.restore();
    }
  });

  // TODO(NY-1783): Use the API, not direct database calls, once they exist.
  async function createAutomation(name: string): Promise<AutomationFixture> {
    const label = (await models.Label.findOne({ name })) || (await models.Label.add({ name }));
    const fixture: AutomationFixture = {
      id: label.id,
      name,
      automationId: ObjectId().toHexString(),
      actionId: ObjectId().toHexString(),
      revisionId: ObjectId().toHexString(),
    };
    const now = new Date();
    await knex.transaction(async (trx) => {
      await trx('automations').insert({
        id: fixture.automationId,
        name,
        status: 'active',
        created_at: now,
        updated_at: now,
      });
      await trx('automation_trigger_rules').insert({
        id: ObjectId().toHexString(),
        automation_id: fixture.automationId,
        trigger_type: 'label_added',
        label_id: fixture.id,
        created_at: now,
      });
      await trx('automation_actions').insert({
        id: fixture.actionId,
        automation_id: fixture.automationId,
        type: 'wait',
        created_at: now,
        updated_at: now,
      });
      await trx('automation_action_revisions').insert({
        id: fixture.revisionId,
        action_id: fixture.actionId,
        wait_hours: 24,
        created_at: now,
      });
    });
    automations.push(fixture);
    return fixture;
  }

  async function assertEnrollments(automation: AutomationFixture, members: Member[]) {
    await DomainEvents.allSettled();
    const runs = await knex('automation_runs')
      .where('automation_id', automation.automationId)
      .orderBy('member_id');
    assert.deepEqual(
      runs.map((run) => ({ id: run.member_id, email: run.member_email })),
      [...members].sort((a, b) => a.id.localeCompare(b.id)),
    );
    const steps = await knex('automation_run_steps')
      .whereIn(
        'automation_run_id',
        runs.map((run) => run.id),
      )
      .orderBy('automation_run_id');
    assert.deepEqual(
      steps.map((step) => ({
        runId: step.automation_run_id,
        revisionId: step.automation_action_revision_id,
        status: step.status,
      })),
      runs
        .map((run) => ({ runId: run.id, revisionId: automation.revisionId, status: 'pending' }))
        .sort((a, b) => a.runId.localeCompare(b.runId)),
    );
  }

  async function bulk(ids: string[], label: { id: string }, action = 'addLabel') {
    const { body } = await agent
      .put(`/members/bulk/?filter=id:[${ids.join(',')}]`)
      .body({ bulk: { action, meta: { label: { id: label.id } } } })
      .expectStatus(200);
    assert.deepEqual(body.bulk.meta.stats, {
      successful: ids.length,
      unsuccessful: 0,
    });
    await DomainEvents.allSettled();
  }

  async function addMember(email: string, labels: { name: string }[] = []): Promise<Member> {
    const { body } = await agent
      .post('/members/')
      .body({ members: [{ email, labels }] })
      .expectStatus(201);
    await DomainEvents.allSettled();
    return { id: body.members[0].id, email: body.members[0].email };
  }

  it('does not start automations for unrelated labels', async function () {
    const automation = await createAutomation('Matching label');

    await addMember('label-unrelated@example.com', [{ name: 'Unrelated label' }]);

    await assertEnrollments(automation, []);
  });

  it('starts an automation when a label is added to a member', async function () {
    const automation = await createAutomation('Individual label');
    const member = await addMember('label-enrollment-individual@example.com');

    await agent
      .put(`/members/${member.id}/`)
      .body({ members: [{ labels: [{ id: automation.id, name: automation.name }] }] })
      .expectStatus(200);

    await assertEnrollments(automation, [member]);
  });

  it('starts an automation when a label is added to members in bulk', async function () {
    const automation = await createAutomation('Bulk enrollment label');
    const members = [
      await addMember('label-enrollment-bulk-1@example.com'),
      await addMember('label-enrollment-bulk-2@example.com'),
    ];

    await bulk(
      members.map((member) => member.id),
      automation,
    );

    await assertEnrollments(automation, members);
  });

  it('starts an automation when a member is created with a label', async function () {
    const creation = await createAutomation('Creation label');
    const other = await createAutomation('Other creation label');

    const member = await addMember('automation-label-create@example.com', [
      { name: creation.name },
    ]);

    await assertEnrollments(creation, [member]);
    await assertEnrollments(other, []);
  });

  it('starts an automation for a new label without restarting the existing label automation', async function () {
    const creation = await createAutomation('Existing edit label');
    const update = await createAutomation('New edit label');
    const member = await addMember('automation-label-edit@example.com', [{ name: creation.name }]);

    await agent
      .put(`/members/${member.id}/`)
      .body({
        members: [{ labels: [{ name: 'EXISTING EDIT LABEL' }, { name: update.name }] }],
      })
      .expectStatus(200);

    await assertEnrollments(creation, [member]);
    await assertEnrollments(update, [member]);
  });

  it('starts an automation when a member signs up with a label', async function () {
    const automation = await createAutomation('Signup Event');
    const email = 'automation-label-signup@example.com';
    const api = membersService.api;
    const magicLink = await api.getMagicLink(email, 'signup', { labels: [automation.name] });
    const token = new URL(magicLink).searchParams.get('token');
    assert.ok(token);

    await api.getMemberDataFromMagicLinkToken(token);

    const member = await models.Member.findOne({ email });
    assert.ok(member);
    await assertEnrollments(automation, [{ id: member.id, email }]);
  });

  it('starts matching automations for members imported from CSV', async function () {
    const first = await createAutomation('label');
    const second = await createAutomation('another-label');
    const third = await createAutomation('and-one-more');

    const { body } = await agent
      .post('/members/upload/')
      .attach(
        'membersfile',
        path.join(__dirname, '../../utils/fixtures/csv/valid-members-labels.csv'),
      )
      .expectStatus(201);

    assert.equal(body.meta.stats.imported, 2);
    const members = await knex<Member>('members')
      .whereIn('email', ['member+labels_1@example.com', 'member+labels_2@example.com'])
      .select('id', 'email')
      .orderBy('email');
    assert.equal(members.length, 2);
    await assertEnrollments(first, [members[0]]);
    await assertEnrollments(second, [members[1]]);
    await assertEnrollments(third, [members[1]]);
  });

  it('starts one run for newly labeled members and skips members who already have the label', async function () {
    const existing = await addMember('automation-label-existing@example.com', [
      { name: 'Bulk event label' },
    ]);
    const automation = await createAutomation('Bulk event label');
    const added = await addMember('automation-label-new@example.com');

    await bulk([existing.id, added.id], automation);
    await bulk([existing.id, added.id], automation);

    await assertEnrollments(automation, [added]);
    const links = await knex('members_labels').where('label_id', automation.id);
    assert.equal(links.length, 2, 'no duplicate label assignments');
  });

  it('does not restart an automation when a label is removed and added back', async function () {
    const automation = await createAutomation('Re-added bulk label');
    const member = await addMember('label-readd@example.com', [{ name: automation.name }]);

    await bulk([member.id], automation, 'removeLabel');
    await bulk([member.id], automation);

    await assertEnrollments(automation, [member]);
  });

  it('enrolls once when concurrent requests add the same label to the same member', async function () {
    const automation = await createAutomation('Concurrent event label');
    const member = await addMember('automation-label-concurrent@example.com');

    await Promise.all([bulk([member.id], automation), bulk([member.id], automation)]);

    await assertEnrollments(automation, [member]);
    assert.equal((await knex('members_labels').where('label_id', automation.id)).length, 1);
  });

  it('enrolls both members when concurrent requests add the same label to different members', async function () {
    const automation = await createAutomation('Disjoint event label');
    const members = [
      await addMember('automation-label-disjoint-1@example.com'),
      await addMember('automation-label-disjoint-2@example.com'),
    ];
    const original = models.Member.lockForUpdate;
    let count = 0;
    let release: () => void = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    sinon.stub(models.Member, 'lockForUpdate').callsFake(async function (
      ids: string[],
      options: { transacting: Knex.Transaction; columns?: string[] },
    ) {
      const rows = await original.call(models.Member, ids, options);
      count += 1;
      if (count === 2) {
        release();
      }
      await ready;
      return rows;
    });

    await Promise.all(members.map((member) => bulk([member.id], automation)));

    await assertEnrollments(automation, members);
  });
});
