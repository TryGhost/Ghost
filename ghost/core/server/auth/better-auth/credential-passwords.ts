import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import type { AuthEngine } from '../../../shared/config/schema/auth';
import { hasAuthTables } from './auth-tables';
import { generateGhostId } from './ghost-models';
import type { WriteHook } from './knex-adapter';

// Dual-writes `users.password` and the `credential` row in `user_accounts`
// while both engines exist (plan §4.5)

type Executor = Knex | Knex.Transaction;

/**
 * Legacy side: copies a user's new hash to their credential row, creating it
 * if missing. Pass the save's transaction so both writes commit together.
 * A no-op where `user_accounts` doesn't exist.
 *
 * Not an upsert: `ON DUPLICATE KEY UPDATE` takes next-key locks, so
 * concurrent user inserts deadlock. `isNew` skips straight to the insert.
 */
export async function syncCredentialPassword(
  executor: Executor,
  userId: string,
  hash: string,
  { isNew = false }: { isNew?: boolean } = {},
): Promise<void> {
  if (!hasAuthTables()) {
    return;
  }

  const now = new Date();
  if (!isNew) {
    const updated = await executor('user_accounts')
      .where({ provider_id: 'credential', account_id: userId })
      .update({ password: hash, updated_at: now });
    if (updated) {
      return;
    }
  }

  await executor('user_accounts').insert({
    id: generateGhostId(),
    user_id: userId,
    account_id: userId,
    provider_id: 'credential',
    password: hash,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Better Auth side: the Knex adapter's `onWrite` hooks. Copies a credential
 * hash Better Auth wrote to `users.password` inside the same transaction.
 */
export const ghostWriteHooks: Record<string, WriteHook> = {
  user_accounts: async (trx, rows, values) => {
    if (!('password' in values)) {
      return;
    }
    for (const row of rows) {
      // users.password is NOT NULL
      if (row.provider_id === 'credential' && typeof row.password === 'string') {
        await trx('users')
          .where('id', row.user_id as string)
          .update({ password: row.password });
      }
    }
  },
};

/**
 * Copies each credential hash that differs between `users.password` and
 * `user_accounts` from the active engine's store, one user per transaction.
 * Failures are logged and left for the next run. A no-op where
 * `user_accounts` doesn't exist.
 */
export async function reconcileCredentialPasswords(knex: Knex, engine: AuthEngine): Promise<void> {
  if (!hasAuthTables()) {
    return;
  }

  const mismatched: { id: string }[] = await knex('users')
    .join('user_accounts', function () {
      this.on('user_accounts.user_id', '=', 'users.id').andOnVal(
        'user_accounts.provider_id',
        '=',
        'credential',
      );
    })
    .where((qb) => {
      qb.whereNull('user_accounts.password').orWhere(
        'user_accounts.password',
        '<>',
        knex.ref('users.password'),
      );
    })
    .select('users.id');

  let fixed = 0;
  for (const { id } of mismatched) {
    try {
      const wrote = await knex.transaction(async (trx) => {
        const user = await trx('users').where('id', id).forUpdate().first('password');
        const account = await trx('user_accounts')
          .where({ user_id: id, provider_id: 'credential' })
          .forUpdate()
          .first('id', 'password');
        if (!user || !account || user.password === account.password) {
          return false;
        }
        if (engine === 'legacy') {
          await trx('user_accounts')
            .where('id', account.id)
            .update({ password: user.password, updated_at: new Date() });
          return true;
        }
        // users.password is NOT NULL, so a credential without a hash is left alone
        if (typeof account.password !== 'string') {
          return false;
        }
        await trx('users').where('id', id).update({ password: account.password });
        return true;
      });
      if (wrote) {
        fixed += 1;
      }
    } catch (err) {
      logging.error({
        message: `Failed to reconcile the credential password for user ${id}`,
        err,
      });
    }
  }

  if (fixed) {
    logging.info(`Reconciled ${fixed} credential password(s) from the ${engine} engine's store`);
  }
}
