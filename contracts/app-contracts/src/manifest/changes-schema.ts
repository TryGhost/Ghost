import { z } from 'zod';

import { APP_PERMISSION_KEYS, type AppPermissionKey } from '../scopes.ts';

const FieldChangeSchema = z.strictObject({
  kind: z.literal('field'),
  // Where in the manifest the change is, e.g. `surfaces[0].url`.
  path: z.string(),
  // Whether this change needs the publisher to approve it before it applies.
  requires_approval: z.boolean(),
});

const AccessChangeSchema = z.strictObject({
  kind: z.literal('access'),
  scope: z.enum(APP_PERMISSION_KEYS as [AppPermissionKey, ...AppPermissionKey[]]),
  // `added` and `removed` are the scope itself. `backend_added` and `backend_removed` are a scope
  // declared on both sides that the backend may now, or no longer, use on its own.
  change: z.enum(['added', 'removed', 'backend_added', 'backend_removed']),
  // For an added scope, whether the backend may use it; for a removed one, whether it could.
  backend: z.boolean(),
});

/**
 * One change as Ghost stores and serves it, for reading a stored change back: a field by its
 * path, or one scope's access.
 */
export const ManifestChangeSchema = z.discriminatedUnion('kind', [
  FieldChangeSchema,
  AccessChangeSchema,
]);

/**
 * A field of the manifest that differs, other than access. Inferred from its schema, so the two
 * can't drift.
 */
export type FieldChange = z.output<typeof FieldChangeSchema>;

/**
 * How access differs between two versions of a manifest, one scope at a time. Ghost sends changes
 * in this shape, in a preview and in an installation's history.
 */
export type AccessChange = z.output<typeof AccessChangeSchema>;

/** One thing that differs between two versions of a manifest: a field, or one scope's access. */
export type ManifestChange = z.output<typeof ManifestChangeSchema>;
