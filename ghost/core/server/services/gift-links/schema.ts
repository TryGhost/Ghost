import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';
import type { SchemaTable } from '../../lib/db-types/tables';

export const DbGiftLink = z.object({
  token: z.string(),
  post_id: z.string(),
  created_at: DbDate,
  updated_at: DbDate.nullable(),
});

declare module 'knex/types/tables' {
  interface Tables {
    gift_links: SchemaTable<'gift_links'>;
    // The association carries no domain object, so nothing parses its rows.
    post_gift_links: SchemaTable<'post_gift_links'>;
  }
}
