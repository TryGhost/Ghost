import { readPasswordHash } from '../../core/server/auth/better-auth/credential-password';

const db = require('../../core/server/data/db');

/** A user's stored hash, from their credential row */
export function passwordHashOf(user: { id: string }): Promise<string> {
  return readPasswordHash(db.knex, { id: user.id });
}
