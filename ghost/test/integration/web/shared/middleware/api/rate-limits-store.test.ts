import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import type { SpamPrevention } from '../../../../../../core/server/web/shared/middleware/api/spam-prevention';
import configUtils from '../../../../../utils/config-utils';

const db = require('../../../../../../core/server/data/db');
const dbUtils = require('../../../../../utils/db-utils');
const spamPrevention: SpamPrevention = require('../../../../../../core/server/web/shared/middleware/api/spam-prevention');

/** Sends one request through a limiter and reports whether it got through. */
const attempt = (middleware: (req: Request, res: Response, next: NextFunction) => void) =>
  new Promise<boolean>((resolve, reject) => {
    middleware(
      { ip: '127.0.0.1', path: '/session' } as Request,
      { set() {} } as unknown as Response,
      ((err?: { errorType?: string }) => {
        if (!err) {
          return resolve(true);
        }
        return err.errorType === 'TooManyRequestsError' ? resolve(false) : reject(err);
      }) as NextFunction,
    );
  });

describe('rate_limits store', function () {
  beforeAll(async function () {
    await dbUtils.reset();
  });

  beforeEach(async function () {
    await dbUtils.truncate('rate_limits');
    spamPrevention.reset();
  });

  afterEach(async function () {
    await configUtils.restore();
    spamPrevention.reset();
    await dbUtils.truncate('rate_limits');
  });

  it('counts, blocks and resets through the rate_limits table', async function () {
    configUtils.set('spam:global_block', {
      freeRetries: 1,
      minWait: 60000,
      maxWait: 60000,
      lifetime: 3600,
    });
    const limiter = spamPrevention.globalBlock();

    assert.equal(await attempt(limiter.middleware), true);
    assert.equal(await attempt(limiter.middleware), true);
    assert.equal(await attempt(limiter.middleware), false);

    const rows = await db.knex('rate_limits').select();
    assert.deepEqual(rows.map((row: { key: string }) => row.key.split(':').slice(0, 2)).sort(), [
      ['globalBlock', 'count'],
      ['globalBlock', 'step'],
      ['globalBlock', 'wait'],
    ]);

    await limiter.reset({ ip: '127.0.0.1', key: '/session/' });

    assert.deepEqual(await db.knex('rate_limits').select(), []);
    assert.equal(await attempt(limiter.middleware), true);
  });

  it('lets only freeRetries + 1 of a concurrent burst through', async function () {
    configUtils.set('spam:global_block', {
      freeRetries: 4,
      minWait: 60000,
      maxWait: 60000,
      lifetime: 3600,
    });
    const limiter = spamPrevention.globalBlock();

    const outcomes = await Promise.all(
      Array.from({ length: 25 }, () => attempt(limiter.middleware)),
    );

    assert.equal(outcomes.filter(Boolean).length, 5);
  });

  it('shares the verification-email budget across instances and IPs, and resets only that user', async function () {
    configUtils.set('spam:send_verification_code_user', {
      freeRetries: 4,
      minWait: 3600000,
      maxWait: 3600000,
      lifetime: 3600,
    });
    const first = spamPrevention.verificationEmail();
    spamPrevention.reset();
    const second = spamPrevention.verificationEmail();
    const outcomes = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        (i % 2 ? first : second).consume({ ip: `192.0.2.${i}`, key: 'user-1' }),
      ),
    );

    assert.equal(outcomes.filter((result) => result.allowed).length, 5);
    assert.equal((await second.consume({ key: 'user-1' })).allowed, false);
    assert.equal((await second.consume({ key: 'user-2' })).allowed, true);
    await second.reset({ key: 'user-2' });
    assert.equal((await first.consume({ key: 'user-1' })).allowed, false);
    await second.reset({ key: 'user-1' });
    assert.equal((await first.consume({ key: 'user-1' })).allowed, true);
  });

  it('shares a challenge budget across instances and IPs under concurrency', async function () {
    const first = spamPrevention.userVerificationChallenge();
    spamPrevention.reset();
    const second = spamPrevention.userVerificationChallenge();
    const outcomes = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        (i % 2 ? first : second).consume({ ip: `192.0.2.${i}`, key: 'same-challenge' }),
      ),
    );

    assert.equal(outcomes.filter((result) => result.allowed).length, 5);
    assert.equal((await second.consume({ key: 'same-challenge' })).allowed, false);
    assert.equal((await second.consume({ key: 'fresh-challenge' })).allowed, true);
  });

  it('clears only expired rows', async function () {
    await db.knex('rate_limits').insert([
      { key: 'expired', points: 1, expire: Date.now() - 1000 },
      { key: 'live', points: 1, expire: Date.now() + 60000 },
    ]);

    await spamPrevention.clearExpired();

    assert.deepEqual(
      (await db.knex('rate_limits').select('key')).map((row: { key: string }) => row.key),
      ['live'],
    );
  });

  it('clears expired rows across more than one batch', async function () {
    const expired = Date.now() - 1000;
    const rows = Array.from({ length: 1203 }, (_, i) => ({
      key: `expired:${i}`,
      points: 1,
      expire: expired,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      await db.knex('rate_limits').insert(rows.slice(i, i + 200));
    }
    await db.knex('rate_limits').insert({ key: 'live', points: 1, expire: Date.now() + 60000 });

    await spamPrevention.clearExpired();

    assert.deepEqual(
      (await db.knex('rate_limits').select('key')).map((row: { key: string }) => row.key),
      ['live'],
    );
  });
});
