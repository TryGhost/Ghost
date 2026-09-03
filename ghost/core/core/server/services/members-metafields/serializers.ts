import { z } from 'zod';
import { snakeKeys } from '../../lib/case-keys';
import { Metafield } from './models';

const MetafieldResource = z.object({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});
const MetafieldsResponse = z.object({ members_metafields: z.array(MetafieldResource) });

export const toMetafieldsResponse = z
  .array(Metafield)
  .transform((fields): z.input<typeof MetafieldsResponse> => ({
    members_metafields: fields.map((field) => snakeKeys(field)),
  }))
  .pipe(MetafieldsResponse);
