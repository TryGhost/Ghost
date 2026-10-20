import assert from 'node:assert/strict';
import InvitationLimiter, {
  type InvitationLimits,
} from '../../../core/server/services/invites/invitation-limiter';

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');

describe('Trial invitation admission', function () {
  let now: number;
  let limits: InvitationLimits | undefined;
  let limiter: InvitationLimiter;

  beforeAll(async function () {
    await dbUtils.reset();
  });

  beforeEach(async function () {
    await dbUtils.truncate('brute');
    await dbUtils.truncate('staff_invite_usage');
    await dbUtils.truncate('invites');
    now = Date.parse('2026-10-20T12:00:00Z');
    limits = { maxStaff: 10, maxInvites: 15, minIntervalSeconds: 60 };
    limiter = new InvitationLimiter(
      db.knex,
      () => limits,
      () => now,
    );
  });

  it('admits exactly one of twenty concurrent requests across instances', async function () {
    const other = new InvitationLimiter(
      db.knex,
      () => limits,
      () => now,
    );
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) => (index % 2 ? limiter : other).rateLimit()),
    );
    assert.equal(results.filter((wait) => wait === 0).length, 1);
    assert.equal(results.filter((wait) => wait === 60).length, 19);
  });

  it('does not extend the minute when requests are rejected and survives restarts', async function () {
    assert.equal(await limiter.rateLimit(), 0);
    now += 59_000;
    assert.equal(await limiter.rateLimit(), 1);
    now += 1000;
    const restarted = new InvitationLimiter(
      db.knex,
      () => limits,
      () => now,
    );
    assert.equal(await restarted.rateLimit(), 0);
  });

  it('admits only fifteen concurrent email preparations even without the HTTP guard', async function () {
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, (_, i) => limiter.run(`person-${i}@example.com`, async () => i)),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 15);
    for (const result of results) {
      if (result.status === 'rejected') {
        assert.equal(result.reason.errorType, 'HostLimitError');
        assert.match(result.reason.message, /15 staff invitation emails/);
      }
    }
  });

  it('never resets the trial allowance at midnight, after extensions, or after rate cleanup', async function () {
    for (let i = 0; i < 15; i++) {
      await limiter.run('resend@example.com', async () => {});
      now += 60_000;
    }
    now += 90 * 86400_000;
    await dbUtils.truncate('brute');
    const restarted = new InvitationLimiter(
      db.knex,
      () => ({ ...limits! }),
      () => now,
    );
    await assert.rejects(
      restarted.run('new@example.com', async () => assert.fail()),
      /Upgrade to send more/,
    );
    const row = await db.knex('staff_invite_usage').where({ key: 'trial' }).first();
    assert.equal(row.count, 15);
  });

  it('reserves the last seat atomically, including pending Contributor invitations', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    limits!.maxStaff = Number(users.count) + 1;
    const role = await db.knex('roles').where({ name: 'Contributor' }).first();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        limiter.run(`person-${i}@example.com`, async (transaction) => {
          await transaction!('invites').insert({
            id: String(i).padStart(24, '0'),
            email: `person-${i}@example.com`,
            role_id: role.id,
            status: 'sent',
            token: `token-${i}`,
            expires: now + 86400_000,
            created_at: new Date(now),
          });
        }),
      ),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const invite = await db.knex('invites').first();
    // A resend reuses the occupied slot even at capacity.
    await limiter.run(invite.email, async () => {});
    const usage = await db.knex('staff_invite_usage').first();
    assert.equal(usage.count, 2);
  });

  it('rolls back email allowance and invitation changes on preparation failure', async function () {
    await assert.rejects(
      limiter.run('person@example.com', async (transaction) => {
        await transaction!('brute').insert({
          key: 'test',
          count: 1,
          firstRequest: now,
          lastRequest: now,
          lifetime: now + 1000,
        });
        throw new Error('Invalid invitation');
      }),
      /Invalid invitation/,
    );
    assert.deepEqual(await db.knex('staff_invite_usage').select(), []);
    assert.deepEqual(await db.knex('brute').select(), []);
  });

  it('stops enforcing on upgrade without erasing the previously used allowance', async function () {
    await limiter.run('person@example.com', async () => {});
    await limiter.rateLimit();
    limits = undefined;
    assert.equal(await limiter.rateLimit(), 0);
    await limiter.run('paid@example.com', async (transaction) =>
      assert.equal(transaction, undefined),
    );
    assert.equal((await db.knex('staff_invite_usage').first()).count, 1);
    limits = { maxStaff: 10, maxInvites: 1, minIntervalSeconds: 60 };
    await assert.rejects(
      limiter.run('trial-again@example.com', async () => assert.fail()),
      /Upgrade/,
    );
  });
});
