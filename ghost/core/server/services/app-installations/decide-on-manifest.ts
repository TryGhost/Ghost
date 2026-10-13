import { compareManifests } from '@tryghost/app-contracts/manifest';
import type { CurrentInstallation } from './codec';
import type { LoadedManifest } from './load-manifest';

/** One field that differs from what the publisher approved. */
export interface AppManifestChange {
  /** Where the change is: a path in the manifest, or `manifest_url` when the app moved. */
  path: string;
  requires_approval: boolean;
}

/** The approved side of a comparison: the approved manifest and where it is read from. */
type Approved = Pick<CurrentInstallation, 'manifest_url' | 'manifest'>;

/**
 * What differs between the approved manifest and a loaded one. The preview lists these
 * and the decision is made from them, so what a publisher reviews and what Ghost does
 * cannot disagree.
 */
export function changesFrom(approved: Approved, loaded: LoadedManifest): AppManifestChange[] {
  const { changes } = compareManifests(
    { manifestUrl: approved.manifest_url, manifest: approved.manifest },
    { manifestUrl: loaded.manifestUrl, manifest: loaded.manifest },
  );
  return changes.map(({ path, requiresApproval }) => ({
    path,
    requires_approval: requiresApproval,
  }));
}

/**
 * What to do with a loaded manifest, given the installation's approved manifest and the
 * one waiting for approval, if any:
 *
 * - `unchanged`: it is the approved manifest and nothing waits, so there is nothing to do;
 * - `use_pending`: it is the manifest already waiting for approval;
 * - `apply`: it differs from the approved one only in silent changes, or not at all while
 *   another manifest waits, which means the app went back on the changes that wait. Either
 *   way it becomes the approved manifest and nothing waits any more;
 * - `suspend`: it has changes that need the publisher's approval, so it waits in place of
 *   any manifest waiting before.
 *
 * This is what Ghost would do with a manifest it picked up by itself. An approval acts on
 * the same decision, but applies what the publisher reviewed whatever it needed.
 */
export type ManifestDecision = 'unchanged' | 'use_pending' | 'apply' | 'suspend';

export function decideOnManifest({
  current,
  pending,
  loaded,
}: {
  current: Approved;
  /** The manifest waiting for approval. Its digest covers its address too. */
  pending: { digest: string } | null;
  loaded: LoadedManifest;
}): ManifestDecision {
  if (pending && pending.digest === loaded.digest) {
    return 'use_pending';
  }
  const changes = changesFrom(current, loaded);
  if (changes.length === 0) {
    return pending ? 'apply' : 'unchanged';
  }
  return changes.some((change) => change.requires_approval) ? 'suspend' : 'apply';
}
