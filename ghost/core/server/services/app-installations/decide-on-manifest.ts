import { compareManifests } from '@tryghost/app-contracts/manifest';
import type { CurrentInstallation } from './codec';
import type { LoadedManifest } from './load-manifest';

/** One field that differs from what the publisher approved. */
export interface AppManifestChange {
  /** Where the change is: a path in the manifest, or `manifest_url` when the app moved. */
  path: string;
  requires_approval: boolean;
}

type Approved = Pick<CurrentInstallation, 'manifest_url' | 'manifest'>;

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

/** What to do with a loaded manifest. `decideOnManifest` describes each kind. */
export type ManifestDecisionKind = 'unchanged' | 'use_pending' | 'apply' | 'suspend';

/** A decision with the changes it was based on, so `keepManifest` doesn't compare again. */
export interface ManifestDecision {
  kind: ManifestDecisionKind;
  changes: AppManifestChange[];
}

/**
 * Decides what to do with a loaded manifest, given the approved manifest and the pending
 * one, if any:
 *
 * - `unchanged`: it's the approved manifest and nothing is pending. Nothing to do.
 * - `use_pending`: it's the pending manifest.
 * - `apply`: it differs from the approved manifest only in silent changes, or it's the
 *   approved manifest while something is pending, meaning the app reverted the pending
 *   changes. It becomes the approved manifest and clears the pending one.
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
  pending: { digest: string } | null;
  loaded: LoadedManifest;
}): ManifestDecision {
  const { changes, requiresApproval } = compare(current, loaded);
  if (pending && pending.digest === loaded.digest) {
    return { kind: 'use_pending', changes };
  }
  if (changes.length === 0) {
    return { kind: pending ? 'apply' : 'unchanged', changes };
  }
  return { kind: requiresApproval ? 'suspend' : 'apply', changes };
}
