import { z } from 'zod';
import { snakeKeys } from '../../lib/case-keys';
import { Metafield } from './models';

const MetafieldResource = z.object({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  access: z.object({ member: z.string().optional() }),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});

/** Definitions as the response for an entity's resource carries them, under its name. */
export function toMetafieldsResponse(resource: string, fields: Metafield[]) {
  return {
    [resource]: z.array(MetafieldResource).parse(fields.map((field) => snakeKeys(field))),
  };
}
