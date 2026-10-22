import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import ObjectId from 'bson-objectid';
import {
  lockStaffInvites,
  checkTrialStaffLimit,
} from '../../../core/server/lib/staff-invite-usage';
import InvitationLimiter, {
  type InvitationLimits,
} from '../../../core/server/services/invites/invitation-limiter';

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');

const dependencies = {
  knex: db.knex,
  getUpgradeUrl: () => undefined,
  lockStaffInvites,
  checkTrialStaffLimit,
};

describe('Trial invitation admission', function () {
  let limits: InvitationLimits | undefined;
  let limiter: InvitationLimiter;
  let originalLimits: InvitationLimits | undefined;
  let roleId: string;
  let actorId: string;

  beforeAll(async function () {
    await dbUtils.reset();
    originalLimits = config.get('hostSettings:staffInvites');
    roleId = (await db.knex('roles').where({ name: 'Contributor' }).first()).id;
    actorId = (await db.knex('users').first()).id;
  });

  beforeEach(async function () {
    await dbUtils.truncate('brute');
    await dbUtils.truncate('actions');
    await dbUtils.truncate('invites');
    limits = { maxStaff: 10, maxInvites: 15 };
    config.set('hostSettings:staffInvites', limits);
    limiter = new InvitationLimiter({
      ...dependencies,
      getLimits: () => limits,
    });
  });

  afterEach(function () {
    config.set('hostSettings:staffInvites', originalLimits);
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

  it('admits only fifteen concurrent email preparations even without the HTTP guard', async function () {
    limits!.maxStaff = 50;
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
      getLimits: () => ({ ...limits! }),
    });
    await assert.rejects(
      restarted.run('new@example.com', async () => assert.fail()),
      /Upgrade to send more/,
    );
    assert.equal((await actions()).length, 15);
  });

  it('reserves the last seat atomically, including pending Contributor invitations', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    limits!.maxStaff = Number(users.count) + 1;
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
    assert.deepEqual(await db.knex('brute').select(), []);
  });

  it('stops enforcing on upgrade without erasing the previously used allowance', async function () {
    await limiter.run('person@example.com', (transaction) =>
      prepare('person@example.com', transaction),
    );
    limits = undefined;
    await limiter.run('paid@example.com', async (transaction) =>
      assert.equal(transaction, undefined),
    );
    assert.equal((await actions()).length, 1);
    limits = { maxStaff: 10, maxInvites: 1 };
    await assert.rejects(
      limiter.run('trial-again@example.com', async () => assert.fail()),
      /Upgrade/,
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
      /Upgrade/,
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
