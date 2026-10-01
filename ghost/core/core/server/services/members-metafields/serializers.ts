import { z } from 'zod';
import { PART_TYPE_IDS, partTypesOf, type FieldType } from '@tryghost/metafield-types';
import { snakeKeys } from '../../lib/case-keys';
import { Metafield } from './models';

const MetafieldPart = z.object({ key: z.string(), type: z.enum(PART_TYPE_IDS) });

const MetafieldResource = z.object({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
  // A composite's parts in the order they are shown, each with the type of value it
  // holds; null for a type whose value is a single thing. Sent so a client can draw a
  // field without knowing its type, whichever Ghost version the site runs.
  parts: z.array(MetafieldPart).nullable(),
  status: z.string(),
  access: z.object({ member: z.string() }),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});
const MetafieldsResponse = z.object({ members_metafields: z.array(MetafieldResource) });

const partsOf = (type: FieldType): z.input<typeof MetafieldPart>[] | null => {
  const parts = partTypesOf(type);
  return parts && Object.entries(parts).map(([key, partType]) => ({ key, type: partType }));
};

export const toMetafieldsResponse = z
  .array(Metafield)
  .transform((fields): z.input<typeof MetafieldsResponse> => ({
    members_metafields: fields.map((field) => ({
      ...snakeKeys(field),
      parts: partsOf(field.type),
    })),
  }))
  .pipe(MetafieldsResponse);
