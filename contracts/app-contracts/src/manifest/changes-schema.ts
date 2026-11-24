import { z } from 'zod';

import { APP_PERMISSION_KEYS, type AppPermissionKey } from '../scopes.ts';

const FieldChangeSchema = z.strictObject({
  kind: z.literal('field'),
  // Where in the manifest the change is, e.g. `surfaces[0].url`.
  path: z.string(),
  // Whether this change needs the publisher to approve it before it applies.
  requires_approval: z.boolean(),
});

const ScopeChangeSchema = z.strictObject({
  kind: z.literal('scope'),
  scope: z.enum(APP_PERMISSION_KEYS as [AppPermissionKey, ...AppPermissionKey[]]),
  // A scope the app now asks for, or no longer does.
  change: z.enum(['added', 'removed']),
});

/**
 * One change as Ghost stores and serves it, for reading a stored change back: a field by its
 * path, or one scope's access.
 */
export const ManifestChangeSchema = z.discriminatedUnion('kind', [
  FieldChangeSchema,
  ScopeChangeSchema,
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
export type ScopeChange = z.output<typeof ScopeChangeSchema>;

/** One thing that differs between two versions of a manifest: a field, or one scope's access. */
export type ManifestChange = z.output<typeof ManifestChangeSchema>;
