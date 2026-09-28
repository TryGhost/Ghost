import { domainToUnicode } from 'node:url';
import { parseEmailAddress } from '@tryghost/parse-email-address';
import type { Knex } from 'knex';

/** A comparison key, never a replacement for the stored recipient address. */
export function emailAddressKey(email: string): string {
  const parsed = parseEmailAddress(email);
  return parsed ? `${parsed.local}@${parsed.domain}`.toLowerCase() : email.toLowerCase();
}

export function isSameEmailAddress(
  stored: string | null | undefined,
  received: string | undefined,
): boolean {
  return Boolean(
    stored &&
    received &&
    (stored.toLowerCase() === received.toLowerCase() ||
      emailAddressKey(stored) === emailAddressKey(received)),
  );
}

/** Use indexed MySQL candidates, then reject broader collation matches in JavaScript. */
export async function findEmailAddressMatches(
  query: Knex.QueryBuilder,
  column: string,
  addresses: string[],
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  if (!addresses.length) {
    return [];
  }
  const keys = new Set(addresses.map(emailAddressKey));
  const variants = new Set(addresses.flatMap((email) => [email, email.toLowerCase()]));
  for (const email of addresses) {
    const parsed = parseEmailAddress(email);
    if (parsed) {
      variants.add(`${parsed.local}@${parsed.domain}`.toLowerCase());
      variants.add(`${parsed.local}@${domainToUnicode(parsed.domain)}`.toLowerCase());
    }
  }
  const client = query.client.config.client;
  const sqlite = client === 'sqlite3' || client === 'better-sqlite3';
  const candidates = query.clone();
  const rows: Array<{ id: string } & Record<string, unknown>> = sqlite
    ? await candidates.whereRaw(`LOWER(??) IN (${[...variants].map(() => '?').join(', ')})`, [
        column,
        ...[...variants].map((email) => email.toLowerCase()),
      ])
    : await candidates.whereIn(column, [...variants]);
  const matches = rows.filter((row) => {
    const email = row[column];
    return typeof email === 'string' && keys.has(emailAddressKey(email));
  });
  // SQLite LOWER only folds ASCII. Check non-ASCII rows using the same JS comparison.
  // The caller keeps newsletter queries scoped to their email ID.
  if (sqlite) {
    const unicodeRows: Array<{ id: string } & Record<string, unknown>> = await query
      .clone()
      .whereRaw("?? GLOB '*[^ -~]*'", [column]);
    const found = new Set(matches.map((row) => row.id));
    for (const row of unicodeRows) {
      const email = row[column];
      if (!found.has(row.id) && typeof email === 'string' && keys.has(emailAddressKey(email))) {
        matches.push(row);
        found.add(row.id);
      }
    }
  }
  return matches;
}
