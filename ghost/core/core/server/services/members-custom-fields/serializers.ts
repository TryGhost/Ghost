import { z } from 'zod';
import { snakeKeys } from '../../lib/case-keys';
import { CustomField } from './models';

// Response schema — the field-definition shape the admin endpoints emit. `id` is
// the DB primary key and deliberately never leaves the API; a field is addressed
// by its namespace and immutable `key`. The `.pipe` below strips id from the
// mapped output.
const CustomFieldResource = z.object({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});
const CustomFieldsResponse = z.object({ members_metafields: z.array(CustomFieldResource) });

export const toCustomFieldsResponse = z
  .array(CustomField)
  .transform((fields): z.input<typeof CustomFieldsResponse> => ({
    members_metafields: fields.map((field) => snakeKeys(field)),
  }))
  .pipe(CustomFieldsResponse);
