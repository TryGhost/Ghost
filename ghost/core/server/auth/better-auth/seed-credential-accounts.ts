import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { hasAuthTables } from './auth-tables';
import { generateGhostId } from './ghost-models';

/**
 * Gives every user without one a `credential` row in `user_accounts`, holding
 * the hash from `users.password` (plan §4.4). Idempotent, so it runs on every
 * boot where the in-development tables exist; on graduation a migration
 * backfills them instead.
 */
export async function seedCredentialAccounts(knex: Knex): Promise<void> {
  if (!hasAuthTables()) {
    return;
  }

  const users: { id: string; password: string }[] = await knex('users')
    .leftJoin('user_accounts', function () {
      this.on('user_accounts.user_id', '=', 'users.id').andOnVal(
        'user_accounts.provider_id',
        '=',
        'credential',
      );
    })
    .whereNull('user_accounts.id')
    .select('users.id', 'users.password');

  if (!users.length) {
    return;
  }

  const now = new Date();
  await knex('user_accounts')
    .insert(
      users.map((user) => ({
        id: generateGhostId(),
        user_id: user.id,
        account_id: user.id,
        provider_id: 'credential',
        password: user.password,
        created_at: now,
        updated_at: now,
      })),
    )
    // another process may seed the same users concurrently
    .onConflict(['provider_id', 'account_id'])
    .ignore();

  logging.info(`Seeded ${users.length} credential account(s) in user_accounts`);
}
