import { z } from 'zod';

const FieldChangeSchema = z.strictObject({
  kind: z.literal('field'),
  // Where in the manifest the change is, e.g. `surfaces[0].url`.
  path: z.string(),
  // Whether this change needs the publisher to approve it before it applies.
  requires_approval: z.boolean(),
});

/** One change as Ghost serves it, for reading a change back: a field by its path. */
export const ManifestChangeSchema = z.discriminatedUnion('kind', [FieldChangeSchema]);

/** A field of the manifest that differs. Inferred from its schema, so the two can't drift. */
export type FieldChange = z.output<typeof FieldChangeSchema>;

/** One thing that differs between two versions of a manifest: a field. */
export type ManifestChange = z.output<typeof ManifestChangeSchema>;
