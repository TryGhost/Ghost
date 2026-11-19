import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbMetafield } from './schema';
import { Metafield } from './models';

// DbMetafield reads the type and its settings against each other, so both pass through as they
// are, and camelKeys keeps their types without a cast.
export const metafieldCodec = z.codec(DbMetafield.asStored, Metafield, {
  decode: (row) => ({ ...camelKeys(row), access: { member: row.member_access } }),
  encode: (field) => ({ ...snakeKeys(field), member_access: field.access.member }),
});

/**
 * The same codec, except that a field whose stored settings can't be read is read with its type's
 * default settings.
 */
export const metafieldCodecWithDefaults = z.codec(DbMetafield.withDefaults, Metafield, {
  decode: (row) => ({ ...camelKeys(row), access: { member: row.member_access } }),
  encode: (field) => ({ ...snakeKeys(field), member_access: field.access.member }),
});
