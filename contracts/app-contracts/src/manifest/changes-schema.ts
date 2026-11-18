import { z } from 'zod';

import { APP_SCOPE_NAMES, type AppScopeName } from '../scopes.ts';
import type { ManifestChange } from './changes.ts';

const FieldChangeSchema = z.strictObject({
  kind: z.literal('field'),
  path: z.string(),
  requires_approval: z.boolean(),
});

const AccessChangeSchema = z.strictObject({
  kind: z.literal('access'),
  scope: z.enum(APP_SCOPE_NAMES as [AppScopeName, ...AppScopeName[]]),
  change: z.enum(['added', 'removed', 'backend_added', 'backend_removed']),
  backend: z.boolean(),
});

/**
 * One change as Ghost stores and serves it, for reading a stored change back: a field by its
 * path, or one scope's access.
 */
export const ManifestChangeSchema = z.discriminatedUnion('kind', [
  FieldChangeSchema,
  AccessChangeSchema,
]) satisfies z.ZodType<ManifestChange>;
