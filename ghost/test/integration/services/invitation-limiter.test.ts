import assert from 'node:assert/strict';
import InvitationLimiter, {
  type InvitationLimits,
} from '../../../core/server/services/invites/invitation-limiter';

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');

describe('Staff invitation admission', function () {
  let now: number;
  let limits: InvitationLimits | undefined;
  let limiter: InvitationLimiter;

  beforeAll(async function () {
    await dbUtils.reset();
  });

  beforeEach(async function () {
    await dbUtils.truncate('brute');
    now = Date.parse('2026-10-20T12:00:00Z');
    limits = { maxPerDay: 10, cooldownSeconds: 300 };
    limiter = new InvitationLimiter(
      db.knex,
      () => limits,
      () => now,
    );
  });

  afterEach(async function () {
    await dbUtils.truncate('brute');
  });

  it('admits exactly ten of twenty simultaneous invitations to different recipients', async function () {
    const admitted: number[] = [];
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, index) =>
        limiter.run(`recipient-${index}@example.com`, async () => admitted.push(index)),
      ),
    );
    assert.equal(admitted.length, 10);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 10);
    for (const result of results) {
      if (result.status === 'rejected') {
        assert.equal(result.reason.code, 'STAFF_INVITE_DAILY_LIMIT');
      }
    }
  });

  it('admits one simultaneous send per normalized recipient across limiter instances', async function () {
    const secondInstance = new InvitationLimiter(
      db.knex,
      () => limits,
      () => now,
    );
    const results = await Promise.allSettled([
      limiter.run(' Recipient@example.com ', async () => 'first'),
      secondInstance.run('recipient@EXAMPLE.COM', async () => 'second'),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result) => result.status === 'rejected');
    assert.equal(rejected?.reason.code, 'STAFF_INVITE_COOLDOWN');
  });

  it('counts resends toward the daily allowance and rejects until the cooldown expires', async function () {
    limits = { maxPerDay: 2, cooldownSeconds: 300 };
    await limiter.run('recipient@example.com', async () => {});
    now += 299_000;
    await assert.rejects(
      limiter.run('recipient@example.com', async () => assert.fail()),
      {
        code: 'STAFF_INVITE_COOLDOWN',
      },
    );
    now += 1000;
    await limiter.run('recipient@example.com', async () => {});
    now += 300_000;
    await assert.rejects(
      limiter.run('recipient@example.com', async () => assert.fail()),
      {
        code: 'STAFF_INVITE_DAILY_LIMIT',
      },
    );
  });

  it('resets the daily allowance at midnight UTC without resetting a recipient cooldown', async function () {
    limits = { maxPerDay: 1, cooldownSeconds: 300 };
    now = Date.parse('2026-10-20T23:59:00Z');
    await limiter.run('recipient@example.com', async () => {});
    now += 60_000;
    await assert.rejects(
      limiter.run('recipient@example.com', async () => assert.fail()),
      {
        code: 'STAFF_INVITE_COOLDOWN',
      },
    );
    await limiter.run('other@example.com', async () => {});
  });

  it('retains cooldowns and usage when the host changes the daily cap', async function () {
    limits = { cooldownSeconds: 300 };
    for (let index = 0; index < 12; index++) {
      await limiter.run(`recipient-${index}@example.com`, async () => {});
    }
    await assert.rejects(
      limiter.run('recipient-0@example.com', async () => assert.fail()),
      {
        code: 'STAFF_INVITE_COOLDOWN',
      },
    );
    // Reinstating a cap does not reset the already-used allowance.
    limits = { maxPerDay: 10, cooldownSeconds: 300 };
    await assert.rejects(
      limiter.run('another@example.com', async () => assert.fail()),
      {
        code: 'STAFF_INVITE_DAILY_LIMIT',
      },
    );
  });

  it('applies a higher allowance without resetting usage or the recipient cooldown', async function () {
    limits = { maxPerDay: 1, cooldownSeconds: 300 };
    await limiter.run('recipient@example.com', async () => {});
    limits = { maxPerDay: 2, cooldownSeconds: 300 };
    await assert.rejects(
      limiter.run('recipient@example.com', async () => assert.fail()),
      { code: 'STAFF_INVITE_COOLDOWN' },
    );
    await limiter.run('other@example.com', async () => {});
    await assert.rejects(
      limiter.run('third@example.com', async () => assert.fail()),
      { code: 'STAFF_INVITE_DAILY_LIMIT' },
    );
  });

  it('rolls back both invitation changes and allowance if preparation fails', async function () {
    await assert.rejects(
      limiter.run('recipient@example.com', async (transaction) => {
        assert.ok(transaction);
        await transaction('brute').insert({
          key: 'test-preparation',
          count: 1,
          firstRequest: now,
          lastRequest: now,
          lifetime: now + 1000,
        });
        throw new Error('Invalid invitation');
      }),
      /Invalid invitation/,
    );
    assert.deepEqual(await db.knex('brute').select(), []);
    await limiter.run('recipient@example.com', async () => {});
  });

  it('starts the cooldown after preparation and retains reservations across process restarts', async function () {
    await limiter.run('recipient@example.com', async () => {
      now += 60_000;
    });
    const restarted = new InvitationLimiter(
      db.knex,
      () => limits,
      () => now,
    );
    now += 299_000;
    await assert.rejects(
      restarted.run('recipient@example.com', async () => assert.fail()),
      {
        code: 'STAFF_INVITE_COOLDOWN',
      },
    );
    now += 1000;
    await restarted.run('recipient@example.com', async () => {});
  });

  it('does not reserve allowance when the host has not configured limits', async function () {
    limits = undefined;
    await limiter.run('recipient@example.com', async (transaction) => {
      assert.equal(transaction, undefined);
    });
    assert.deepEqual(await db.knex('brute').select(), []);
  });
});
