import { z } from 'zod';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbCustomField } from './schema';
import { CustomField } from './models';

export const customFieldCodec = z.codec(DbCustomField, CustomField, {
  // DbCustomField validates `type` as the field-type enum, so the decoded row
  // already carries a FieldType and camelKeys preserves it — no cast needed.
  decode: (row) => ({ ...camelKeys(row), namespace: CUSTOM_NAMESPACE }),
  encode: ({ namespace: _namespace, ...field }) => snakeKeys(field),
});
