import { z } from 'zod';
import { CUSTOM_NAMESPACE } from '@tryghost/metafield-types/identity';
import { snakeKeys } from '../../lib/case-keys';
import { accessFromColumns, columnsFromAccess } from './access';
import { DbMetafield } from './schema';
import { Metafield } from './models';

export const metafieldCodec = z.codec(DbMetafield, Metafield, {
  // DbMetafield validates `type` as the field-type enum, so the decoded row
  // already carries a FieldType — no cast needed.
  decode: (row) => ({
    id: row.id,
    namespace: CUSTOM_NAMESPACE,
    key: row.key,
    name: row.name,
    type: row.type,
    status: row.status,
    access: accessFromColumns(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
  encode: ({ namespace: _namespace, access, ...field }) => ({
    ...snakeKeys(field),
    ...columnsFromAccess(access),
  }),
});
