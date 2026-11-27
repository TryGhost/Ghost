import logging from '@tryghost/logging';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { createTransactionalMigration } from '../../utils';

// Never a valid bcrypt hash; marks a user without a password
const PASSWORD_PLACEHOLDER = '!';
const BATCH_SIZE = 500;

// Gives every staff user a `credential` row in `user_accounts` with the hash from
// `users.password`, which becomes the only password store (plan §4.5)
export default createTransactionalMigration(
  async function up(knex) {
    const users: { id: string; password: string | null }[] = await knex('users')
      .leftJoin('user_accounts', function () {
        this.on('user_accounts.user_id', '=', 'users.id').andOnVal(
          'user_accounts.provider_id',
          '=',
          'credential',
        );
      })
      .whereNull('user_accounts.id')
      .select('users.id', 'users.password');

    const withPassword = users.filter(
      (user) => user.password && user.password !== PASSWORD_PLACEHOLDER,
    );
    if (withPassword.length < users.length) {
      logging.info(`Skipping ${users.length - withPassword.length} user(s) without a password`);
    }
    if (!withPassword.length) {
      logging.info(
        'Skipping credential backfill - every user with a password has a credential row',
      );
      return;
    }

    const now = new Date();
    const rows = withPassword.map((user) => ({
      id: new ObjectId().toHexString(),
      user_id: user.id,
      account_id: user.id,
      provider_id: 'credential',
      password: user.password,
      created_at: now,
      updated_at: now,
    }));
    await knex.batchInsert('user_accounts', rows, BATCH_SIZE);

    logging.info(`Added ${rows.length} credential row(s) to user_accounts`);
  },
  // An earlier Ghost reads `users.password`, so copy back every hash that
  // changed since this migration ran
  async function down(knex) {
    if (!(await knex.schema.hasTable('user_accounts'))) {
      logging.warn('Skipping restoring users.password - user_accounts does not exist');
      return;
    }

    // The user's credential hash, where it differs from users.password
    const changed = (query: Knex.QueryBuilder) =>
      query
        .from('user_accounts')
        .whereRaw('user_accounts.account_id = users.id')
        .where('user_accounts.provider_id', 'credential')
        .whereNotNull('user_accounts.password')
        .whereNot('user_accounts.password', PASSWORD_PLACEHOLDER)
        .whereRaw('user_accounts.password <> users.password');

    const restored = await knex('users')
      .whereExists(function () {
        changed(this.select(knex.raw('1')));
      })
      .update({ password: changed(knex.select('user_accounts.password')) });

    logging.info(`Restored ${restored} password hash(es) to users.password`);
  },
);
