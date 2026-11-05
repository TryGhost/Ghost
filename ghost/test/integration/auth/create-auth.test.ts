import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import sinon from 'sinon';
import { knex } from '../../../core/server/data/db';
import config from '../../../core/shared/config';
import urlUtils from '../../../core/shared/url-utils';
import { createAuth } from '../../../core/server/auth/better-auth/create-auth';
import { seedCredentialAccounts } from '../../../core/server/auth/better-auth/seed-credential-accounts';

// @ts-expect-error Test utilities do not have type definitions.
import testUtils from '../../utils';

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(knex.client.config.client);

describe.skipIf(isSQLite)('Better Auth instance', function () {
  const owner = testUtils.DataGenerator.Content.users[0];

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));

  beforeAll(async function () {
    await seedCredentialAccounts(knex);
  });

  afterEach(function () {
    sinon.restore();
  });

  function build() {
    return createAuth({
      db: knex,
      secret: 'a'.repeat(64),
      sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs'),
      urlUtils,
      password: security.password,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
  }

  it('signs in with the legacy password and expires the session exactly admin:sessionMaxAgeMs later', async function () {
    const now = new Date('2026-11-05T12:00:00.123Z');
    sinon.useFakeTimers({ now, toFake: ['Date'] });

    const auth = build();
    const result = await auth.api.signInEmail({
      body: { email: owner.email, password: owner.password },
    });
    assert.ok(result.token);

    const row = await knex('user_sessions').where({ token: result.token }).first();
    assert.ok(row);
    assert.equal(row.user_id, owner.id);
    assert.equal(row.verified, 0);
    assert.equal(
      new Date(row.expires_at).getTime(),
      now.getTime() + config.get('admin:sessionMaxAgeMs'),
    );
  });

  it('rejects a wrong password', async function () {
    await assert.rejects(
      build().api.signInEmail({ body: { email: owner.email, password: 'wrong-password' } }),
      { status: 'UNAUTHORIZED' },
    );
  });
});
