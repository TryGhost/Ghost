import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import * as db from '../../../core/server/data/db';
const labs: { isSet(name: string): boolean } = require('../../../core/shared/labs');
import type { AddAutomationData } from '../../../core/server/services/automations/automations-api';

const {
  createDatabaseAutomationsRepository,
}: typeof import('../../../core/server/services/automations/database-automations-repository') = require('../../../core/server/services/automations/database-automations-repository');

const { agentProvider, fixtureManager, hostLimits } = require('../../utils/e2e-framework');

const payload = (status: 'active' | 'inactive' = 'active'): AddAutomationData => ({
  name: `Limit test ${ObjectId().toHexString()}`,
  description: '',
  status,
  trigger_tier_scope: 'free',
  actions: [{ id: ObjectId().toHexString(), type: 'wait', data: { wait_hours: 1 } }],
  edges: [],
});

describe('Automation host limits', () => {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  beforeAll(async () => {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });
  beforeEach(async () => {
    const stub = sinon.stub(labs, 'isSet').callThrough();
    stub.withArgs('automations').returns(true);
    stub.withArgs('automationsPerTier').returns(true);
  });
  afterEach(async () => {
    sinon.restore();
    await hostLimits.restoreHostLimits();
    const ids = await db
      .knex('automations')
      .where('name', 'like', 'Limit test %')
      .orWhereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid'])
      .pluck('id');
    const actions = await db.knex('automation_actions').whereIn('automation_id', ids).pluck('id');
    await db.knex('automation_action_edges').whereIn('source_action_id', actions).delete();
    await db.knex('automation_action_revisions').whereIn('action_id', actions).delete();
    await db.knex('automation_actions').whereIn('id', actions).delete();
    await db
      .knex('welcome_email_automated_emails')
      .whereIn('welcome_email_automation_id', ids)
      .delete();
    await db.knex('automations').whereIn('id', ids).delete();
  });
  async function countActiveAutomations() {
    const row = await db
      .knex('automations')
      .where('status', 'active')
      .whereExists(
        db
          .knex('automation_actions')
          .select('id')
          .whereRaw('automation_id = automations.id')
          .whereNull('deleted_at'),
      )
      .count({ count: 'id' })
      .first();
    return Number(row?.count);
  }

  async function capAtCurrentCount(extra = 0) {
    await hostLimits.setHostLimits({
      limitAutomations: {
        max: String((await countActiveAutomations()) + extra),
        error: 'Active automation limit reached.',
      },
    });
  }

  it('rejects active add and activation edit at cap, but allows inactive creation', async () => {
    await capAtCurrentCount();
    const active = payload();
    const blocked = await agent
      .post('automations')
      .body({ automations: [active] })
      .expectStatus(403);
    assert.equal(blocked.body.errors[0].type, 'HostLimitError');
    assert.equal(blocked.body.errors[0].context, 'Active automation limit reached.');
    assert.equal(await db.knex('automations').where('name', active.name).first(), undefined);
    const draft = payload('inactive');
    const created = await agent
      .post('automations')
      .body({ automations: [draft] })
      .expectStatus(201);
    const id = created.body.automations[0].id;
    await agent
      .put(`automations/${id}`)
      .body({ automations: [{ ...draft, status: 'active' }] })
      .expectStatus(403);
    assert.equal((await db.knex('automations').where('id', id).first()).status, 'inactive');
    await agent
      .put(`automations/${id}`)
      .body({ automations: [draft] })
      .expectStatus(200);
  });

  it('allows active edits and deactivation at cap, then reuses the released slot', async () => {
    const active = payload();
    const created = await agent
      .post('automations')
      .body({ automations: [active] })
      .expectStatus(201);
    const id = created.body.automations[0].id;
    await capAtCurrentCount();
    await agent
      .put(`automations/${id}`)
      .body({ automations: [{ ...active, description: 'Edited' }] })
      .expectStatus(200);
    await agent
      .put(`automations/${id}`)
      .body({ automations: [{ ...active, status: 'inactive' }] })
      .expectStatus(200);
    await agent
      .post('automations')
      .body({ automations: [payload()] })
      .expectStatus(201);
  });

  it('skips the limit lock for inactive writes but locks existing active edits', async () => {
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    const active = await repository.add(payload());
    const republished = await repository.add(payload());
    await capAtCurrentCount();
    const limitLockQueries: string[] = [];
    const capture = (query: { sql: string; bindings?: unknown[] }) => {
      if (query.sql.includes('for update') && query.bindings?.includes('site_uuid')) {
        limitLockQueries.push(query.sql);
      }
    };
    db.knex.on('query', capture);
    try {
      const draft = await repository.add(payload('inactive'));
      await repository.edit(draft.id, { ...draft, description: 'Edited draft' });
      await repository.edit(active.id, { ...active, status: 'inactive' });
      assert.deepEqual(limitLockQueries, []);
      assert.equal(await countActiveAutomations(), 1);
      await repository.edit(republished.id, { ...republished, description: 'Edited active' });
      assert.equal(limitLockQueries.length, 1);
      assert.equal(await countActiveAutomations(), 1);
    } finally {
      db.knex.off('query', capture);
    }
  });

  it('allows activation without a configured limit', async () => {
    await hostLimits.setHostLimits({});
    await agent
      .post('automations')
      .body({ automations: [payload()] })
      .expectStatus(201);
  });

  it('rolls back a failed activation write and releases the slot', async () => {
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    const existing = await repository.add(payload('inactive'));
    await capAtCurrentCount(1);
    const invalid = { ...payload(), actions: existing.actions, edges: existing.edges };
    await assert.rejects(repository.add(invalid));
    assert.equal(await db.knex('automations').where('name', invalid.name).first(), undefined);
    await agent
      .post('automations')
      .body({ automations: [payload()] })
      .expectStatus(201);
  });

  it.each(['add/add', 'edit/edit', 'add/edit', 'same edit'])(
    'serializes concurrent %s activations across repository instances',
    async (scenario) => {
      const repositories = [0, 1].map(() =>
        createDatabaseAutomationsRepository({ knex: db.knex, fakeWaitHoursMultiplier: null }),
      );
      const first = await repositories[0].add(payload('inactive'));
      const second = await repositories[1].add(payload('inactive'));
      await capAtCurrentCount(1);
      let attempts: Array<() => Promise<unknown>>;
      let expectedSuccesses = 1;
      switch (scenario) {
        case 'add/add':
          attempts = [() => repositories[0].add(payload()), () => repositories[1].add(payload())];
          break;
        case 'add/edit':
          attempts = [
            () => repositories[0].add(payload()),
            () => repositories[1].edit(second.id, { ...second, status: 'active' }),
          ];
          break;
        case 'edit/edit':
          attempts = [
            () => repositories[0].edit(first.id, { ...first, status: 'active' }),
            () => repositories[1].edit(second.id, { ...second, status: 'active' }),
          ];
          break;
        case 'same edit':
          attempts = [
            () => repositories[0].edit(first.id, { ...first, status: 'active' }),
            () => repositories[1].edit(first.id, { ...first, status: 'active' }),
          ];
          expectedSuccesses = 2;
          break;
        default:
          assert.fail(`Unknown concurrency scenario: ${scenario}`);
      }
      const before = await countActiveAutomations();
      const results = await Promise.allSettled(attempts.map((attempt) => attempt()));
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        expectedSuccesses,
      );
      for (const result of results) {
        if (result.status === 'rejected') {
          assert.equal(result.reason.errorType, 'HostLimitError');
        }
      }
      const after = await countActiveAutomations();
      assert.equal(after, before + 1);
    },
  );
});
