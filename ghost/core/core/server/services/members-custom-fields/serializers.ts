import { z } from 'zod';
import { snakeKeys } from '../../lib/case-keys';
import { CustomField } from './models';

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
