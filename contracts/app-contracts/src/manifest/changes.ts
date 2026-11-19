import type { ManifestChange } from './changes-schema.ts';

/**
 * Reading changes without zod at runtime. The change types are inferred from the schema in
 * `changes-schema.ts`, so they can't drift from what Ghost serves.
 */

/** Whether a change needs the publisher's approval. A field says so itself. */
export function changeRequiresApproval(change: ManifestChange): boolean {
  return change.requires_approval;
}
