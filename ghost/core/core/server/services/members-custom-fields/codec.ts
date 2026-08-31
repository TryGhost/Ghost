import { z } from 'zod';
import { CUSTOM_NAMESPACE } from '@tryghost/custom-field-types/identity';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { DbCustomField } from './schema';
import { CustomField } from './models';

// Maps a members_custom_fields row to/from the domain CustomField (snake_case to
// camelCase; DbDate decoding happens in DbCustomField).
//
// The namespace is injected here rather than read: the table has no namespace column
// because every row is the publisher's. This codec is the one layer that knows that, so
// real namespace storage later changes this file and a migration, nothing above.

export const customFieldCodec = z.codec(DbCustomField, CustomField, {
  // DbCustomField validates `type` as the field-type enum, so the decoded row
  // already carries a FieldType and camelKeys preserves it — no cast needed.
  decode: (row) => ({ ...camelKeys(row), namespace: CUSTOM_NAMESPACE }) as const,
  encode: ({ namespace: _namespace, ...field }) => snakeKeys(field),
});
