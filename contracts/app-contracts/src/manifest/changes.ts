import { widensAccess, type AccessChange } from './access.ts';

/**
 * One thing that differs between two versions of a manifest, as Ghost stores and serves it.
 * Free of zod, so Admin can tell changes apart without validating anything; the schema that
 * reads a stored change back is in `changes-schema.ts`.
 */

/** A field of the manifest that differs, other than access. */
export interface FieldChange {
  readonly kind: 'field';
  /** Where in the manifest the change is, e.g. `surfaces[0].url`. */
  readonly path: string;
  /** Whether this change needs the publisher to approve it before it applies. */
  readonly requires_approval: boolean;
}

/** One thing that differs between two versions of a manifest: a field, or one scope's access. */
export type ManifestChange = FieldChange | AccessChange;

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
