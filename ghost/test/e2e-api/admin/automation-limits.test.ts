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

  async function createWelcome(slug: string, status = 'inactive') {
    const result = await agent
      .post('automated_emails')
      .body({
        automated_emails: [
          {
            name:
              slug === 'member-welcome-email-free'
                ? 'Free member welcome flow'
                : 'Paid member welcome flow',
            slug,
            status,
            subject: 'Welcome',
            lexical: JSON.stringify({ root: { children: [] } }),
          },
        ],
      })
      .expectStatus(201);
    return result.body.automated_emails[0];
  }

  it('allows active welcome emails at automation cap without consuming slots', async () => {
    const existing = await agent
      .post('automations')
      .body({ automations: [payload()] })
      .expectStatus(201);
    await capAtCurrentCount();
    const free = await createWelcome('member-welcome-email-free', 'active');
    const paid = await createWelcome('member-welcome-email-paid');
    await agent
      .put(`automated_emails/${paid.id}`)
      .body({ automated_emails: [{ name: paid.name, status: 'active' }] })
      .expectStatus(200);
    assert.equal(await countActiveAutomations(), 1);
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    await repository.browse({ includeStats: false });
    for (const { id } of [free, paid]) {
      assert.equal((await db.knex('automations').where('id', id).first()).status, 'inactive');
    }
    assert.equal(
      (await db.knex('automations').where('id', existing.body.automations[0].id).first()).status,
      'active',
    );
  });

  it('does not count unmigrated welcome emails against new automation activations', async () => {
    const free = await createWelcome('member-welcome-email-free', 'active');
    const paid = await createWelcome('member-welcome-email-paid', 'active');
    await hostLimits.setHostLimits({ limitAutomations: { max: '1' } });
    await agent
      .post('automations')
      .body({ automations: [payload()] })
      .expectStatus(201);
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    await repository.browse({ includeStats: false });
    assert.equal(await countActiveAutomations(), 1);
    for (const { id } of [free, paid]) {
      assert.equal((await db.knex('automations').where('id', id).first()).status, 'inactive');
    }
  });

  it('rejects legacy status changes once welcome emails are converted', async () => {
    const free = await createWelcome('member-welcome-email-free', 'active');
    await hostLimits.setHostLimits({ limitAutomations: { max: '0' } });
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    await repository.browse({ includeStats: false });
    const blocked = await agent
      .put(`automated_emails/${free.id}`)
      .body({ automated_emails: [{ name: free.name, status: 'active' }] })
      .expectStatus(422);
    assert.equal(blocked.body.errors[0].property, 'status');
    assert.match(blocked.body.errors[0].context, /automations API/);
    await agent
      .put(`automated_emails/${free.id}`)
      .body({ automated_emails: [{ name: free.name, status: 'inactive', subject: 'Edited' }] })
      .expectStatus(200);
    assert.equal(await countActiveAutomations(), 0);
  });

  it('serializes legacy status changes with capped conversion', async () => {
    const free = await createWelcome('member-welcome-email-free', 'active');
    await hostLimits.setHostLimits({ limitAutomations: { max: '0' } });
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    const [legacy] = await Promise.all([
      agent
        .put(`automated_emails/${free.id}`)
        .body({ automated_emails: [{ name: free.name, status: 'active' }] }),
      repository.browse({ includeStats: false }),
    ]);
    assert.ok([200, 422].includes(legacy.statusCode));
    assert.equal((await db.knex('automations').where('id', free.id).first()).status, 'inactive');
    assert.equal(await countActiveAutomations(), 0);
  });

  it('keeps welcome statuses without acquiring the limit lock on unconfigured plans', async () => {
    await hostLimits.setHostLimits({});
    const free = await createWelcome('member-welcome-email-free', 'active');
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    const limitLockQueries: string[] = [];
    const capture = (query: { sql: string; bindings?: unknown[] }) => {
      if (query.sql.includes('for update') && query.bindings?.includes('site_uuid')) {
        limitLockQueries.push(query.sql);
      }
    };
    db.knex.on('query', capture);
    try {
      await agent
        .put(`automated_emails/${free.id}`)
        .body({ automated_emails: [{ name: free.name, status: 'inactive' }] })
        .expectStatus(200);
      await agent
        .put(`automated_emails/${free.id}`)
        .body({ automated_emails: [{ name: free.name, status: 'active' }] })
        .expectStatus(200);
      await Promise.all([repository.add(payload()), repository.browse({ includeStats: false })]);
      const automation = await repository.getById(free.id);
      assert.ok(automation);
      assert.equal(automation.status, 'active');
      await repository.edit(free.id, { ...automation, status: 'inactive' });
    } finally {
      db.knex.off('query', capture);
    }
    assert.deepEqual(limitLockQueries, []);
  });

  it.each([0, 1, 2])(
    'migrates welcome emails with %s available active slots deterministically',
    async (slots) => {
      const existing = await agent
        .post('automations')
        .body({ automations: [payload()] })
        .expectStatus(201);
      const free = await createWelcome('member-welcome-email-free', 'active');
      const paid = await createWelcome('member-welcome-email-paid', 'active');
      await capAtCurrentCount(slots);
      const repository = createDatabaseAutomationsRepository({
        knex: db.knex,
        fakeWaitHoursMultiplier: null,
      });
      await Promise.all([
        repository.browse({ includeStats: false }),
        repository.browse({ includeStats: false }),
      ]);
      assert.equal(
        (await db.knex('automations').where('id', existing.body.automations[0].id).first()).status,
        'active',
      );
      const statuses = async () =>
        Promise.all(
          [free, paid].map(
            async ({ id }) => (await db.knex('automations').where('id', id).first()).status,
          ),
        );
      assert.deepEqual(await statuses(), [
        slots > 0 ? 'active' : 'inactive',
        slots > 1 ? 'active' : 'inactive',
      ]);
      assert.equal(
        (await db.knex('automation_actions').whereIn('automation_id', [free.id, paid.id])).length,
        2,
      );
      await capAtCurrentCount(2);
      await repository.browse({ includeStats: false });
      assert.deepEqual(await statuses(), [
        slots > 0 ? 'active' : 'inactive',
        slots > 1 ? 'active' : 'inactive',
      ]);
    },
  );

  it('serializes welcome conversion with modern activation for the final slot', async () => {
    const free = await createWelcome('member-welcome-email-free', 'active');
    await createWelcome('member-welcome-email-paid', 'active');
    await capAtCurrentCount(1);
    const repository = createDatabaseAutomationsRepository({
      knex: db.knex,
      fakeWaitHoursMultiplier: null,
    });
    const [activation, conversion] = await Promise.allSettled([
      repository.add(payload()),
      repository.browse({ includeStats: false }),
    ]);
    assert.equal(conversion.status, 'fulfilled');
    assert.equal(await countActiveAutomations(), 1);
    const welcome = await db.knex('automations').where('id', free.id).first();
    if (activation.status === 'fulfilled') {
      assert.equal(welcome.status, 'inactive');
    } else {
      assert.equal(activation.reason.errorType, 'HostLimitError');
      assert.equal(welcome.status, 'active');
    }
  });

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
