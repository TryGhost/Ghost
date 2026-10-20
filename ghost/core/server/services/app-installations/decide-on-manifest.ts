import { compareManifests } from '@tryghost/app-contracts/manifest';
import type { z } from 'zod';
import type { Installation } from './codec';
import type { LoadedManifest } from './load-manifest';
import type { AppInstallationManifestSource } from './schema';

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

/** A manifest the installation already has a row for. */
export interface ExistingManifest {
  id: string;
}

/**
 * What to do with a loaded manifest, with the changes it was based on, so storing it doesn't
 * compare again. `decideOnManifest` describes each kind.
 */
export type ManifestDecision =
  | { kind: 'unchanged' | 'apply' | 'resume' | 'suspend'; changes: AppManifestChange[] }
  | { kind: 'use_pending'; changes: AppManifestChange[]; pending: ExistingManifest };

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
export function decideOnManifest({
  current,
  pending,
  loaded,
}: {
  current: Approved;
  pending: (ExistingManifest & { digest: string }) | null;
  loaded: LoadedManifest;
}): ManifestDecision {
  const { changes, requiresApproval } = compare(current, loaded);
  if (pending && pending.digest === loaded.digest) {
    return { kind: 'use_pending', changes, pending };
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
 * What storing a decision writes, decided before anything is written:
 *
 * - `nothing`: the installation stays as it is.
 * - `approve_existing`: a manifest that already has a row becomes the approved manifest, and
 *   any pending one is let go of.
 * - `add`: the loaded manifest gets a new row, which becomes the approved manifest or the
 *   pending one.
 */
export type ManifestWrite =
  | { kind: 'nothing' }
  | { kind: 'approve_existing'; manifest: ExistingManifest }
  | {
      kind: 'add';
      source: z.infer<typeof AppInstallationManifestSource>;
      requiresApproval: boolean;
      becomes: 'approved' | 'pending';
    };

/**
 * What a publisher's approval of the loaded manifest writes. It becomes the approved manifest
 * whatever changed. The pending manifest and the approved one already have rows, so
 * approving either adds none; approving the approved manifest lets go of the pending one,
 * and writes nothing if nothing is pending. Any other manifest gets an `approval` row.
 */
export function approvalWrite(
  decision: ManifestDecision,
  current: Pick<Installation, 'manifest_id'>,
): ManifestWrite {
  switch (decision.kind) {
    case 'unchanged':
      return { kind: 'nothing' };
    case 'use_pending':
      return { kind: 'approve_existing', manifest: decision.pending };
    case 'apply':
    case 'resume':
    case 'suspend':
      if (decision.changes.length === 0) {
        return { kind: 'approve_existing', manifest: { id: current.manifest_id } };
      }
      return {
        kind: 'add',
        source: 'approval',
        requiresApproval: decision.changes.some((change) => change.requires_approval),
        becomes: 'approved',
      };
  }
}

/**
 * What a re-check writes for the loaded manifest. No person made these changes, so each gets
 * a manifest row as its only record.
 */
export function recheckWrite(decision: ManifestDecision): ManifestWrite {
  switch (decision.kind) {
    case 'unchanged':
    case 'use_pending':
      return { kind: 'nothing' };
    // Silent changes are applied straight away. When the app reverted the pending changes,
    // that lifts the suspension.
    case 'apply':
    case 'resume':
      return {
        kind: 'add',
        source: decision.kind === 'resume' ? 'resume' : 'update',
        requiresApproval: false,
        becomes: 'approved',
      };
    // Any other change becomes the pending manifest, replacing an older one.
    case 'suspend':
      return { kind: 'add', source: 'update', requiresApproval: true, becomes: 'pending' };
  }
}
