import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbMetafield } from './schema';
import { Metafield } from './models';

export const metafieldCodec = z.codec(DbMetafield, Metafield, {
  // DbMetafield reads the type and its settings against each other, so both pass through as they
  // are, and camelKeys keeps their types without a cast.
  decode: (row) => ({ ...camelKeys(row), access: { member: row.member_access } }),
  encode: (field) => ({ ...snakeKeys(field), member_access: field.access.member }),
});
