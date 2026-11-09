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
      { ip: '127.0.0.1' } as Request,
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

    assert.equal(await attempt(limiter.prevent), true);
    assert.equal(await attempt(limiter.prevent), true);
    assert.equal(await attempt(limiter.prevent), false);

    const rows = await db.knex('rate_limits').select();
    assert.deepEqual(rows.map((row: { key: string }) => row.key.split(':').slice(0, 2)).sort(), [
      ['globalBlock', 'count'],
      ['globalBlock', 'step'],
      ['globalBlock', 'wait'],
    ]);

    await new Promise<void>((resolve) => {
      limiter.reset('127.0.0.1', undefined, () => resolve());
    });

    assert.deepEqual(await db.knex('rate_limits').select(), []);
    assert.equal(await attempt(limiter.prevent), true);
  });

  it('lets only freeRetries + 1 of a concurrent burst through', async function () {
    configUtils.set('spam:global_block', {
      freeRetries: 4,
      minWait: 60000,
      maxWait: 60000,
      lifetime: 3600,
    });
    const limiter = spamPrevention.globalBlock();

    const outcomes = await Promise.all(Array.from({ length: 25 }, () => attempt(limiter.prevent)));

    assert.equal(outcomes.filter(Boolean).length, 5);
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
});
