import { widensAccess } from './scopes.ts';
import type { ScopeChange, FieldChange, ManifestChange } from './changes-schema.ts';

/**
 * Telling changes apart without zod at runtime, so Admin can do it without validating anything.
 * The change types are inferred from the schema in `changes-schema.ts`, so they can't drift from
 * what Ghost stores and serves.
 */

export function isFieldChange(change: ManifestChange): change is FieldChange {
  return change.kind === 'field';
}

export function isScopeChange(change: ManifestChange): change is ScopeChange {
  return change.kind === 'scope';
}

/** Splits changes into the fields and the scope changes, each in the order given. */
export function splitChanges(changes: readonly ManifestChange[]): {
  fields: FieldChange[];
  scopes: ScopeChange[];
} {
  return { fields: changes.filter(isFieldChange), scopes: changes.filter(isScopeChange) };
}

/**
 * Whether a change needs the publisher's approval. A field says so itself; a scope change
 * needs it when it widens access.
 */
export function changeRequiresApproval(change: ManifestChange): boolean {
  return isScopeChange(change) ? widensAccess(change) : change.requires_approval;
}
