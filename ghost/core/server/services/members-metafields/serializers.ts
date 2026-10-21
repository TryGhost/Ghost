import { z } from 'zod';
import { type Identity, IdentitySchema, NamespaceSchema } from '@tryghost/metafield-types/identity';
import { snakeKeys } from '../../lib/case-keys';
import { parseRequest } from '../../lib/parse-request';
import { Metafield } from './models';

const NamespaceRoute = z.object({ namespace: NamespaceSchema });

/**
 * The namespace a route names. A segment that breaks the rule every segment follows is
 * refused before anything looks it up, the way a malformed id is.
 */
export function namespaceRoute(options: unknown): z.output<typeof NamespaceRoute> {
  return parseRequest(NamespaceRoute, options, 'namespace');
}

/** The field a route names: the identity its namespace and key make, checked the same way. */
export function fieldRoute(options: unknown): Identity {
  return parseRequest(IdentitySchema, options, 'key');
}

const MetafieldResource = z.object({
  namespace: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  access: z.object({ member: z.string() }),
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
