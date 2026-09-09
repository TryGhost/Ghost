import { z } from 'zod';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbMetafield } from './schema';
import { Metafield } from './models';

export const metafieldCodec = z.codec(DbMetafield, Metafield, {
  // DbMetafield validates `type` as the field-type enum, so the decoded row
  // already carries a FieldType and camelKeys preserves it — no cast needed.
  decode: ({ member_access: memberAccess, ...row }) => ({
    ...camelKeys(row),
    namespace: CUSTOM_NAMESPACE,
    access: { member: memberAccess },
  }),
  encode: ({ namespace: _namespace, access, ...field }) => ({
    ...snakeKeys(field),
    member_access: access.member,
  }),
});
