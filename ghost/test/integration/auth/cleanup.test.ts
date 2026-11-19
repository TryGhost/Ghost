import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';

const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');
const { getInstance: getJobsService } = require('../../../core/server/services/jobs-service');
const ClearExpiredAuthRowsJob =
  require('../../../core/server/auth/better-auth/clear-expired-auth-rows-job').default;
const {
  clearExpiredAuthRows,
  clearExpired,
}: typeof import('../../../core/server/auth/better-auth/cleanup') = require('../../../core/server/auth/better-auth/cleanup');

const HOUR = 60 * 60 * 1000;

async function waitFor(check: () => Promise<boolean>, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
  }
  return false;
}

describe('Better Auth expired row cleanup', function () {
  let userId: string;

  const at = (offsetMs: number) => new Date(Date.now() + offsetMs);

  async function insertSessions(expiries: Date[]) {
    const ids = expiries.map(() => new ObjectId().toHexString());
    await db.knex('user_sessions').insert(
      expiries.map((expiresAt, i) => ({
        id: ids[i],
        user_id: userId,
        token: `token-${ids[i]}`,
        expires_at: expiresAt,
        verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    );
    return ids;
  }

  async function insertVerifications(expiries: Date[]) {
    const ids = expiries.map(() => new ObjectId().toHexString());
    await db.knex('verifications').insert(
      expiries.map((expiresAt, i) => ({
        id: ids[i],
        identifier: `reset-password:${ids[i]}`,
        value: userId,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    );
    return ids;
  }

  const ids = (table: string): Promise<string[]> => db.knex(table).orderBy('id').pluck('id');

  beforeAll(async function () {
    await testUtils.startGhost();
    userId = (await db.knex('users').first('id')).id;
  });

  beforeEach(async function () {
    await db.knex('user_sessions').del();
    await db.knex('verifications').del();
  });

  it('deletes expired sessions and verifications, in batches, and keeps the rest', async function () {
    const [liveSession] = await insertSessions([at(HOUR)]);
    await insertSessions([at(-HOUR), at(-2 * HOUR), at(-3 * HOUR), at(-4 * HOUR), at(-5 * HOUR)]);
    const [liveVerification] = await insertVerifications([at(HOUR)]);
    await insertVerifications([at(-HOUR), at(-2 * HOUR), at(-3 * HOUR)]);

    const deleted = await clearExpiredAuthRows(db.knex, { batchSize: 2 });

    assert.deepEqual(deleted, { user_sessions: 5, verifications: 3 });
    assert.deepEqual(await ids('user_sessions'), [liveSession]);
    assert.deepEqual(await ids('verifications'), [liveVerification]);
  });

  it('deletes nothing when nothing has expired', async function () {
    await insertSessions([at(HOUR)]);
    await insertVerifications([at(HOUR)]);

    const deleted = await clearExpiredAuthRows(db.knex);

    assert.deepEqual(deleted, { user_sessions: 0, verifications: 0 });
    assert.equal((await ids('user_sessions')).length, 1);
    assert.equal((await ids('verifications')).length, 1);
  });

  it('runs as the job handler', async function () {
    await insertSessions([at(-HOUR)]);

    await clearExpired();
    assert.equal((await ids('user_sessions')).length, 0);
  });

  it('clears expired rows when the job is dispatched', async function () {
    const [liveSession] = await insertSessions([at(HOUR)]);
    await insertSessions([at(-HOUR)]);

    // dispatch() resolves once the job is enqueued, not when it has run
    await getJobsService().dispatch(new ClearExpiredAuthRowsJob());

    assert.ok(
      await waitFor(async () => (await ids('user_sessions')).length === 1),
      'the dispatched job deletes the expired session',
    );
    assert.deepEqual(await ids('user_sessions'), [liveSession]);
  });
});
