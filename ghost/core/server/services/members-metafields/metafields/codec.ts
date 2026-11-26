import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../../lib/case-keys';
import { DbMetafield } from './schema';
import { Definition, accessOf, storedAccessOf } from './models';

// DbMetafield reads the type and its settings against each other, so both pass through as they
// are, and camelKeys keeps their types without a cast.
export const metafieldCodec = z.codec(DbMetafield.asStored, Definition, {
  decode: (row) => ({ ...camelKeys(row), access: accessOf(row.member_access) }),
  encode: (field) => ({ ...snakeKeys(field), member_access: storedAccessOf(field.access) }),
});

/**
 * The same codec, except that a field whose stored settings can't be read is read with its type's
 * default settings.
 */
export const metafieldCodecWithDefaults = z.codec(DbMetafield.withDefaults, Definition, {
  decode: (row) => ({ ...camelKeys(row), access: accessOf(row.member_access) }),
  encode: (field) => ({ ...snakeKeys(field), member_access: storedAccessOf(field.access) }),
});
