import { compareManifests } from '@tryghost/app-contracts/manifest';
import type { AddedRow } from './app-installations-repository';
import type { Installation } from './codec';
import type { LoadedManifest } from './load-manifest';

/** One field that differs from what the publisher approved. */
export interface AppManifestChange {
  /** Where the change is: a path in the manifest, or `manifest_url` when the app moved. */
  path: string;
  requires_approval: boolean;
}

type Approved = Pick<Installation, 'manifest_url' | 'manifest'>;

/**
 * Lists what differs between the approved manifest and a loaded one. The preview shows
 * this list and decisions are made from it, so a review always matches what happens.
 */
export function changesFrom(approved: Approved, loaded: LoadedManifest): AppManifestChange[] {
  return compare(approved, loaded).changes;
}

function compare(approved: Approved, loaded: LoadedManifest) {
  const { changes, requiresApproval } = compareManifests(
    { manifestUrl: approved.manifest_url, manifest: approved.manifest },
    { manifestUrl: loaded.manifestUrl, manifest: loaded.manifest },
  );
  return {
    changes: changes.map(({ path, requiresApproval: requires }) => ({
      path,
      requires_approval: requires,
    })),
    requiresApproval,
  };
}

/** The approved, pending and just-loaded manifests. */
interface Manifests {
  current: Pick<Installation, 'manifest_id' | 'manifest_url' | 'manifest'>;
  pending: { id: string; digest: string } | null;
  loaded: LoadedManifest;
}

/** See `decideOnManifest` for each kind. Carries the changes so callers don't compare again. */
export type ManifestDecision =
  | { kind: 'unchanged' | 'apply' | 'resume' | 'suspend'; changes: AppManifestChange[] }
  | { kind: 'use_pending'; changes: AppManifestChange[]; pendingManifestId: string };

/**
 * Decides what to do with a loaded manifest, given the approved manifest and the pending
 * one, if any:
 *
 * - `unchanged`: it's the approved manifest and nothing is pending. Nothing to do.
 * - `use_pending`: it's the pending manifest.
 * - `apply`: it differs from the approved manifest only in silent changes, and nothing is
 *   pending. It becomes the approved manifest.
 * - `resume`: it's the approved manifest, with or without silent changes, while something
 *   is pending, meaning the app reverted the pending changes. It becomes the approved
 *   manifest and clears the pending one, which lifts the suspension.
 * - `suspend`: it has changes that need approval, so it replaces any pending manifest.
 *
 * These are the outcomes for the re-check. An approval applies a `suspend` decision
 * instead of leaving it pending.
 */
export function decideOnManifest({ current, pending, loaded }: Manifests): ManifestDecision {
  const { changes, requiresApproval } = compare(current, loaded);
  if (pending && pending.digest === loaded.digest) {
    return { kind: 'use_pending', changes, pendingManifestId: pending.id };
  }
  if (requiresApproval) {
    return { kind: 'suspend', changes };
  }
  if (pending) {
    return { kind: 'resume', changes };
  }
  return { kind: changes.length === 0 ? 'unchanged' : 'apply', changes };
}

/**
 * Prepare the write so that anything a new row needs can be done outside the transaction.
 *
 * - `nothing`: no write.
 * - `approve_existing`: approve an existing row and clear any pending one.
 * - `add_approved`: add a row, approve it and clear any pending one.
 * - `add_pending`: add a row as the pending manifest, which suspends the installation.
 */
export type ManifestWrite =
  | { kind: 'nothing' }
  | { kind: 'approve_existing'; manifestId: string }
  | { kind: 'add_approved'; row: AddedRow }
  | { kind: 'add_pending'; row: AddedRow };

/**
 * Approving never leaves a manifest pending, so the staff history can't record an approval
 * while the app stays suspended.
 */
export type ApprovalWrite = Exclude<ManifestWrite, { kind: 'add_pending' }>;

/**
 * The reviewed manifest becomes the approved one, even with changes that need approval. It
 * reuses the pending or approved row when it matches, and otherwise adds an `approval` row.
 */
export function approvalWrite(manifests: Manifests): ApprovalWrite {
  const decision = decideOnManifest(manifests);
  switch (decision.kind) {
    case 'unchanged':
      return { kind: 'nothing' };
    case 'use_pending':
      return { kind: 'approve_existing', manifestId: decision.pendingManifestId };
    case 'apply':
    case 'resume':
    case 'suspend':
      if (decision.changes.length === 0) {
        return { kind: 'approve_existing', manifestId: manifests.current.manifest_id };
      }
      return {
        kind: 'add_approved',
        row: {
          loaded: manifests.loaded,
          source: 'approval',
          requiresApproval: decision.kind === 'suspend',
        },
      };
  }
}

/**
 * Every change gets a row, silent ones too: nobody approved them, so the row is their only
 * record.
 */
export function recheckWrite(manifests: Manifests): ManifestWrite {
  const decision = decideOnManifest(manifests);
  const { loaded } = manifests;
  switch (decision.kind) {
    case 'unchanged':
    case 'use_pending':
      return { kind: 'nothing' };
    // Silent changes apply right away. A resume means the app reverted the pending changes.
    case 'apply':
    case 'resume':
      return {
        kind: 'add_approved',
        row: {
          loaded,
          source: decision.kind === 'resume' ? 'resume' : 'update',
          requiresApproval: false,
        },
      };
    // Replaces any older pending manifest, since only the latest is worth reviewing.
    case 'suspend':
      return {
        kind: 'add_pending',
        row: { loaded, source: 'update', requiresApproval: true },
      };
  }
}
