import type { Knex } from 'knex';
import { usesBetterAuth } from './enabled';
import { generateGhostId } from './ghost-models';

// Legacy password store (plan §4.5): the `credential` row in `user_accounts`
// with auth:betterAuthDev, otherwise `users.password`

/** `users.password` once the credential row holds the hash; never a valid bcrypt hash */
export const PASSWORD_PLACEHOLDER = '!';

/**
 * The user's password hash. A user without a credential row gets the
 * placeholder, which no password matches.
 */
export async function readPasswordHash(
  executor: Knex,
  user: { id: string; password?: string | null },
  { forUpdate = false }: { forUpdate?: boolean } = {},
): Promise<string> {
  if (!usesBetterAuth()) {
    return user.password ?? PASSWORD_PLACEHOLDER;
  }

  const query = executor('user_accounts')
    .where({ provider_id: 'credential', account_id: user.id })
    .first('password');
  const account = await (forUpdate ? query.forUpdate() : query);
  return account?.password ?? PASSWORD_PLACEHOLDER;
}

/**
 * Stores a user's new hash in their credential row, creating it if missing.
 * Pass the user write's transaction so both commit together.
 *
 * Not an upsert: `ON DUPLICATE KEY UPDATE` takes next-key locks that deadlock
 * concurrent user inserts in MySQL. `isNew` skips straight to the insert.
 */
export async function writePasswordHash(
  executor: Knex,
  userId: string,
  hash: string,
  { isNew = false }: { isNew?: boolean } = {},
): Promise<void> {
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
