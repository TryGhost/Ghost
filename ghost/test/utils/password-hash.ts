import { readPasswordHash } from '../../core/server/auth/better-auth/credential-password';

const db = require('../../core/server/data/db');

/** A user model's stored hash, from wherever the legacy engine keeps it */
export function passwordHashOf(user: { id: string; get(key: string): unknown }): Promise<string> {
  return readPasswordHash(db.knex, { id: user.id, password: user.get('password') as string });
}
