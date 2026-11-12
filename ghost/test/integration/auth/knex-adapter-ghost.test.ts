import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import { twoFactor } from 'better-auth/plugins';
import type { BetterAuthOptions } from 'better-auth/types';
import { knex } from '../../../core/server/data/db';
import { createKnexAdapter } from '../../../core/server/auth/better-auth/knex-adapter';
import {
  generateGhostId,
  ghostCreateDefaults,
  ghostModelOptions,
  ghostTwoFactorSchema,
  ghostVirtualColumns,
} from '../../../core/server/auth/better-auth/ghost-models';

// @ts-expect-error Test utilities do not have type definitions.
import testUtils from '../../utils';

// Ghost-specific adapter behaviour Better Auth's suite can't cover (PLA-597),
// against Ghost's real tables. See core/server/auth/better-auth/README.md.

const isSQLite = ['sqlite3', 'better-sqlite3'].includes(knex.client.config.client);

type User = {
  id: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

describe.skipIf(isSQLite)('Knex adapter: Ghost-specific behaviour', function () {
  // The instance doesn't enable twoFactor yet; its schema adds twoFactorEnabled
  const options = {
    ...ghostModelOptions,
    plugins: [twoFactor({ schema: ghostTwoFactorSchema })],
    advanced: { database: { generateId: generateGhostId } },
  } as BetterAuthOptions;

  const adapter = createKnexAdapter({
    db: knex,
    virtualColumns: ghostVirtualColumns,
    createDefaults: ghostCreateDefaults,
  })(options);

  const createdUserIds: string[] = [];

  async function createUser(data: Record<string, unknown> = {}): Promise<User> {
    const now = new Date();
    const user = await adapter.create<Record<string, unknown>, User>({
      model: 'user',
      data: {
        name: 'Better Auth User',
        email: `${generateGhostId()}@example.com`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        ...data,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  const findUser = (id: string) =>
    adapter.findOne<User>({ model: 'user', where: [{ field: 'id', value: id }] });

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));

  // Deleting the users cascades to their sessions, accounts and two-factor rows
  afterAll(async function () {
    if (createdUserIds.length) {
      await knex('users').whereIn('id', createdUserIds).del();
    }
  });

  describe('virtual email_verified', function () {
    it('reads true for every user', async function () {
      const created = await createUser({ emailVerified: false });
      assert.equal(created.emailVerified, true);
      assert.equal((await findUser(created.id))?.emailVerified, true);

      const fixtureIds: string[] = (await knex('users').pluck('id')).filter(
        (id: string) => !createdUserIds.includes(id),
      );
      assert(fixtureIds.length > 0, 'fixtures should provide users');
      for (const id of fixtureIds) {
        assert.equal((await findUser(id))?.emailVerified, true);
      }
    });

    it('drops writes of either value without error', async function () {
      const user = await createUser();

      for (const emailVerified of [false, true]) {
        const updated = await adapter.update<User>({
          model: 'user',
          where: [{ field: 'id', value: user.id }],
          update: { emailVerified },
        });
        assert.equal(updated?.emailVerified, true);
      }

      const count = await adapter.updateMany({
        model: 'user',
        where: [{ field: 'id', value: user.id }],
        update: { emailVerified: false },
      });
      assert.equal(count, 1);
      assert.equal((await findUser(user.id))?.emailVerified, true);
    });

    it('filters on the expression', async function () {
      const user = await createUser();
      const where = (value: boolean) => [
        { field: 'id', value: user.id },
        { field: 'emailVerified', value },
      ];

      assert.equal(
        (await adapter.findOne<User>({ model: 'user', where: where(true) }))?.id,
        user.id,
      );
      assert.equal(await adapter.findOne({ model: 'user', where: where(false) }), null);
    });
  });

  describe('virtual two_factor_enabled', function () {
    async function addTwoFactor(userId: string, verified: boolean) {
      await knex('user_two_factors').insert({
        id: generateGhostId(),
        secret: 'secret',
        backup_codes: '[]',
        user_id: userId,
        verified,
      });
    }

    it('reads false without a user_two_factors row', async function () {
      const user = await createUser();
      assert.equal(user.twoFactorEnabled, false);
      assert.equal((await findUser(user.id))?.twoFactorEnabled, false);
    });

    it('reads false with only an unverified row', async function () {
      const user = await createUser();
      await addTwoFactor(user.id, false);
      assert.equal((await findUser(user.id))?.twoFactorEnabled, false);
    });

    it('reads true with a verified row', async function () {
      const user = await createUser();
      await addTwoFactor(user.id, false);
      await addTwoFactor(user.id, true);
      assert.equal((await findUser(user.id))?.twoFactorEnabled, true);
    });

    it('drops writes and filters on the expression', async function () {
      const enrolled = await createUser();
      await addTwoFactor(enrolled.id, true);
      const plain = await createUser();

      const updated = await adapter.update<User>({
        model: 'user',
        where: [{ field: 'id', value: plain.id }],
        update: { twoFactorEnabled: true },
      });
      assert.equal(updated?.twoFactorEnabled, false);

      const ids = [enrolled.id, plain.id];
      const matching = await adapter.findMany<User>({
        model: 'user',
        where: [
          { field: 'id', operator: 'in', value: ids },
          { field: 'twoFactorEnabled', value: true },
        ],
      });
      assert.deepEqual(
        matching.map((u) => u.id),
        [enrolled.id],
      );
    });
  });

  describe('createDefaults', function () {
    it('sets slug to the id and a password the legacy check rejects', async function () {
      const user = await createUser();
      const row = await knex('users').where({ id: user.id }).first('slug', 'password');

      assert.equal(row.slug, user.id);
      assert.equal(row.password, '!');
      assert.equal(await security.password.compare('!', row.password), false);
      assert.equal(await security.password.compare('', row.password), false);
    });
  });

  describe('dates on the new tables', function () {
    const withMs = (offset: number) => new Date(Date.UTC(2026, 10, 5, 12, 0, 0, 123) + offset);

    function assertSameInstant(actual: unknown, expected: Date, label: string) {
      assert(actual instanceof Date, `${label} should read back as a Date`);
      assert.equal(actual.getTime(), expected.getTime(), label);
    }

    async function assertRoundTrip(model: string, table: string, data: Record<string, unknown>) {
      const created = await adapter.create<
        Record<string, unknown>,
        { id: string } & Record<string, unknown>
      >({
        model,
        data,
      });
      const found = await adapter.findOne<Record<string, unknown>>({
        model,
        where: [{ field: 'id', value: created.id }],
      });
      assert(found, `${model} should be found`);

      const row = await knex(table).where({ id: created.id }).first();
      for (const [field, value] of Object.entries(data)) {
        if (!(value instanceof Date)) {
          continue;
        }
        assertSameInstant(created[field], value, `${model}.${field} on create`);
        assertSameInstant(found[field], value, `${model}.${field} on read`);
        assert.equal(new Date(row[ghostColumn(model, field)]).getTime(), value.getTime());
      }
    }

    const ghostColumn = (model: string, field: string) =>
      (ghostModelOptions as Record<string, { fields: Record<string, string> }>)[model].fields[
        field
      ] ?? field;

    it('keeps milliseconds on user_sessions', async function () {
      const user = await createUser();
      await assertRoundTrip('session', 'user_sessions', {
        userId: user.id,
        token: generateGhostId(),
        expiresAt: withMs(1),
        createdAt: withMs(2),
        updatedAt: withMs(3),
      });
    });

    it('keeps milliseconds on user_accounts', async function () {
      const user = await createUser();
      await assertRoundTrip('account', 'user_accounts', {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        accessTokenExpiresAt: withMs(4),
        refreshTokenExpiresAt: withMs(5),
        createdAt: withMs(6),
        updatedAt: withMs(7),
      });
    });

    it('keeps milliseconds on verifications', async function () {
      await assertRoundTrip('verification', 'verifications', {
        identifier: generateGhostId(),
        value: 'value',
        expiresAt: withMs(8),
        createdAt: withMs(9),
        updatedAt: withMs(10),
      });
    });
  });
});
