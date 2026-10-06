import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbMetafield } from './schema';
import { Metafield } from './models';

export const metafieldCodec = z.codec(DbMetafield, Metafield, {
  // DbMetafield validates `type` as the field-type enum, so the decoded row
  // already carries a FieldType and camelKeys preserves it — no cast needed.
  decode: ({ member_access: memberAccess, ...row }) => ({
    ...camelKeys(row),
    access: { member: memberAccess },
  }),
  encode: ({ access, ...field }) => ({
    ...snakeKeys(field),
    member_access: access.member,
  }),
});
