import { widensAccess } from './access.ts';
import type { AccessChange, FieldChange, ManifestChange } from './changes-schema.ts';

/**
 * Telling changes apart without zod at runtime, so Admin can do it without validating anything.
 * The change types are inferred from the schema in `changes-schema.ts`, so they can't drift from
 * what Ghost stores and serves.
 */

export function isFieldChange(change: ManifestChange): change is FieldChange {
  return change.kind === 'field';
}

export function isAccessChange(change: ManifestChange): change is AccessChange {
  return change.kind === 'access';
}

/** Splits changes into the fields and the access changes, each in the order given. */
export function splitChanges(changes: readonly ManifestChange[]): {
  fields: FieldChange[];
  access: AccessChange[];
} {
  return { fields: changes.filter(isFieldChange), access: changes.filter(isAccessChange) };
}

/**
 * Whether a change needs the publisher's approval. A field says so itself; an access change
 * needs it when it widens access.
 */
export function changeRequiresApproval(change: ManifestChange): boolean {
  return isAccessChange(change) ? widensAccess(change) : change.requires_approval;
}
