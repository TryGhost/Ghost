import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import ObjectId from 'bson-objectid';
import { lockStaffInvites } from '../../../core/server/lib/staff-invite-usage';
import InvitationLimiter from '../../../core/server/services/invites/invitation-limiter';
const { limitService, init: initLimits } = require('../../../core/server/services/limits');
import type { LimitConfig } from '@tryghost/limit-service';

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');

const dependencies = {
  transaction: <T>(callback: (transaction: Knex.Transaction) => Promise<T>): Promise<T> =>
    models.Base.transaction(callback),
  limitService,
  lockStaffInvites,
};

describe('Trial invitation admission', function () {
  let limits: Record<string, LimitConfig> | undefined;
  let limiter: InvitationLimiter;
  let originalLimits: Record<string, LimitConfig> | undefined;
  let roleId: string;
  let actorId: string;

  beforeAll(async function () {
    await dbUtils.reset();
    await models.Settings.populateDefaults();
    originalLimits = config.get('hostSettings:limits');
    roleId = (await db.knex('roles').where({ name: 'Contributor' }).first()).id;
    actorId = (await db.knex('users').first()).id;
  });

  beforeEach(async function () {
    await dbUtils.truncate('brute');
    await dbUtils.truncate('actions');
    await dbUtils.truncate('invites');
    limits = {
      limitTrialStaff: {
        max: 10,
        error:
          'Your trial supports up to {{max}} staff, including pending invitations and Contributors.',
      },
      limitTrialStaffInvites: {
        max: 15,
        error: 'Your trial allows {{max}} staff invitation emails in total, including resends.',
      },
    };
    config.set('hostSettings:limits', limits);
    initLimits();
    limiter = new InvitationLimiter({
      ...dependencies,
    });
  });

  afterEach(function () {
    config.set('hostSettings:limits', originalLimits);
    initLimits();
  });

  async function prepare(email: string, transacting?: Knex.Transaction) {
    const options = { context: { user: actorId }, transacting };
    const existing = await models.Invite.findOne({ email }, options);
    if (existing) {
      await existing.destroy(options);
    }
    return models.Invite.add({ email, role_id: roleId }, options);
  }

  function actions() {
    return db.knex('actions').where({ resource_type: 'invite', event: 'added' });
  }

  it('enforces the email allowance without a trial seat cap', async function () {
    config.set('hostSettings:limits', { limitTrialStaffInvites: { max: 1 } });
    initLimits();
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    await assert.rejects(
      limiter.run('second@example.com', (transaction) =>
        prepare('second@example.com', transaction),
      ),
      { errorType: 'HostLimitError' },
    );
    assert.equal((await actions()).length, 1);
  });

  it('enforces the trial seat cap without an email allowance', async function () {
    const [{ count }] = await db.knex('users').count('* as count');
    config.set('hostSettings:limits', { limitTrialStaff: { max: Number(count) + 1 } });
    initLimits();
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    await assert.rejects(
      limiter.run('second@example.com', (transaction) =>
        prepare('second@example.com', transaction),
      ),
      { errorType: 'HostLimitError' },
    );
    await limiter.run('first@example.com', (transaction) =>
      prepare('first@example.com', transaction),
    );
    assert.equal((await db.knex('invites')).length, 1);
  });

  it('initializes the internal lock setting and restores it on an existing site', async function () {
    const initial = await db.knex('settings').where({ key: 'staff_invitation_lock' }).first();
    assert.ok(initial);
    assert.equal(initial.group, 'core');
    assert.equal(initial.value, null);
    await db.knex('settings').where({ id: initial.id }).delete();
    await models.Settings.populateDefaults();
    const restored = await db.knex('settings').where({ key: 'staff_invitation_lock' });
    assert.equal(restored.length, 1);
    assert.equal(restored[0].group, 'core');
    await models.Settings.populateDefaults();
    assert.equal((await db.knex('settings').where({ key: 'staff_invitation_lock' })).length, 1);
  });

  it('fails closed if the lock setting is missing', async function () {
    await assert.rejects(
      models.Base.transaction(async (transaction: Knex.Transaction) => {
        await transaction('settings').where({ key: 'staff_invitation_lock' }).delete();
        await lockStaffInvites(transaction);
      }),
      /Cannot lock the trial staff invitation limits/,
    );
  });

  it('allows brute cleanup while an invitation holds the shared lock', async function () {
    const BruteKnex = require('@tryghost/brute-knex');
    const store = new BruteKnex({ tablename: 'brute', createTable: false, knex: db.knex });
    await db
      .knex('brute')
      .insert({ key: 'expired-test', firstRequest: 0, lastRequest: 0, lifetime: 0, count: 0 });
    let read: Promise<unknown> | undefined;
    try {
      await models.Base.transaction(async (transaction: Knex.Transaction) => {
        await lockStaffInvites(transaction);
        read = new Promise((resolve, reject) => {
          store.get('unrelated-login', (error: Error | null, value: unknown) =>
            error ? reject(error) : resolve(value),
          );
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            read,
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Brute cleanup waited for the invitation lock')),
                2000,
              );
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      });
    } finally {
      await read;
    }
    assert.deepEqual(await db.knex('brute').select(), []);
  });

  it('admits only fifteen concurrent email preparations even without the HTTP guard', async function () {
    limits!.limitTrialStaff.max = 50;
    config.set('hostSettings:limits', limits);
    initLimits();
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, (_, i) => {
        const email = `person-${i}@example.com`;
        return limiter.run(email, (transaction) => prepare(email, transaction));
      }),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 15);
    for (const result of results) {
      if (result.status === 'rejected') {
        assert.equal(result.reason.errorType, 'HostLimitError');
        assert.match(result.reason.message, /15 staff invitation emails/);
      }
    }
    assert.equal((await actions()).length, 15);
  });

  it('preserves the trial allowance after rate cleanup and refreshing the policy', async function () {
    for (let i = 0; i < 15; i++) {
      await limiter.run('resend@example.com', (transaction) =>
        prepare('resend@example.com', transaction),
      );
    }
    await dbUtils.truncate('brute');
    const restarted = new InvitationLimiter({
      ...dependencies,
    });
    await assert.rejects(
      restarted.run('new@example.com', async () => assert.fail()),
      /staff invitation emails/,
    );
    assert.equal((await actions()).length, 15);
  });

  it('reserves the last seat atomically, including pending Contributor invitations', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    limits!.limitTrialStaff.max = Number(users.count) + 1;
    config.set('hostSettings:limits', limits);
    initLimits();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        limiter.run(`person-${i}@example.com`, (transaction) =>
          prepare(`person-${i}@example.com`, transaction),
        ),
      ),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const invite = await db.knex('invites').first();
    // A resend reuses the occupied slot even at capacity.
    await limiter.run(invite.email, (transaction) => prepare(invite.email, transaction));
    assert.equal((await actions()).length, 2);
  });

  it('leaves counted records available to other transactions during preparation', async function () {
    const existing = await limiter.run('existing@example.com', (transaction) =>
      prepare('existing@example.com', transaction),
    );
    const action = await actions().first();

    await limiter.run('new@example.com', async (transaction) => {
      await db.knex.transaction(async (other: Knex.Transaction) => {
        await other('users').where({ id: actorId }).forUpdate().noWait().first();
        await other('invites').where({ id: existing.id }).forUpdate().noWait().first();
        await other('actions').where({ id: action.id }).forUpdate().noWait().first();
      });
      return prepare('new@example.com', transaction);
    });
  });

  it('rejects caller-owned transactions for non-import trial staff creation', async function () {
    await models.Base.transaction(async (transacting: Knex.Transaction) => {
      await assert.rejects(
        models.User.add({ email: 'new@example.com' }, { transacting }),
        /Trial staff creation requires a fresh transaction/,
      );
    });
  });

  it('creates the installation user fixture inside a migration transaction on a trial', async function () {
    const { fixtureManager } = require('../../../core/server/data/schema/fixtures');
    const fixtures = require('../../../core/server/data/schema/fixtures/fixtures.json');
    const owner = fixtures.models.find((model: { name: string }) => model.name === 'User')
      .entries[0];
    const id = ObjectId().toHexString();
    const rollback = new Error('Roll back installation fixture');

    await assert.rejects(
      models.Base.transaction(async (transacting: Knex.Transaction) => {
        const result = await fixtureManager.addFixturesForModel(
          {
            name: 'User',
            entries: [{ ...owner, id, email: 'installation-owner@example.com' }],
          },
          {
            transacting,
            migrating: true,
            autoRefresh: false,
            context: { internal: true, user: id },
          },
        );
        assert.equal(result.done, 1);
        assert.ok(await transacting('users').where({ id }).first());
        assert.deepEqual(await transacting('actions').where({ resource_type: 'invite' }), []);
        throw rollback;
      }),
      (error) => error === rollback,
    );
    assert.equal(await db.knex('users').where({ id }).first(), undefined);
  });

  it('rolls back email allowance and invitation changes on preparation failure', async function () {
    await assert.rejects(
      limiter.run('person@example.com', async (transaction) => {
        await prepare('person@example.com', transaction);
        throw new Error('Invalid invitation');
      }),
      /Invalid invitation/,
    );
    assert.deepEqual(await actions(), []);
    assert.deepEqual(await db.knex('invites').select(), []);
  });

  it('stops enforcing on upgrade without erasing the previously used allowance', async function () {
    await limiter.run('person@example.com', (transaction) =>
      prepare('person@example.com', transaction),
    );
    config.set('hostSettings:limits', undefined);
    initLimits();
    await limiter.run('paid@example.com', async (transaction) =>
      assert.equal(transaction, undefined),
    );
    assert.equal((await actions()).length, 1);
    config.set('hostSettings:limits', {
      ...limits,
      limitTrialStaffInvites: { ...limits!.limitTrialStaffInvites, max: 1 },
    });
    initLimits();
    await assert.rejects(
      limiter.run('trial-again@example.com', async () => assert.fail()),
      /staff invitation emails/,
    );
  });

  it('uses existing audit history and ignores other resource types and events', async function () {
    const rows = Array.from({ length: 14 }, () => ({
      id: ObjectId().toHexString(),
      resource_type: 'invite',
      resource_id: ObjectId().toHexString(),
      actor_type: 'user',
      actor_id: actorId,
      event: 'added',
      created_at: new Date('2025-01-01'),
    }));
    await db
      .knex('actions')
      .insert([
        ...rows,
        { ...rows[0], id: ObjectId().toHexString(), event: 'deleted' },
        { ...rows[0], id: ObjectId().toHexString(), event: 'edited' },
        { ...rows[0], id: ObjectId().toHexString(), resource_type: 'post' },
      ]);
    await limiter.run('last@example.com', (transaction) =>
      prepare('last@example.com', transaction),
    );
    await assert.rejects(
      limiter.run('excess@example.com', async () => assert.fail()),
      /staff invitation emails/,
    );
    assert.equal((await actions()).length, 15);
  });

  it('rejects trial invitation creation without an audit actor and rolls it back', async function () {
    await assert.rejects(
      limiter.run('internal@example.com', (transacting) =>
        models.Invite.add(
          { email: 'internal@example.com', role_id: roleId, status: 'pending' },
          { transacting, context: { internal: true } },
        ),
      ),
      /audit actor/,
    );
    assert.deepEqual(await actions(), []);
    assert.deepEqual(await db.knex('invites').select(), []);
  });
});
