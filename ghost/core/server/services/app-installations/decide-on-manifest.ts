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
 * What differs between the approved manifest and a loaded one. The preview lists these
 * and the decision is made from them, so what a publisher reviews and what Ghost does
 * cannot disagree.
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

/** What to do with a loaded manifest; `decideOnManifest` says what each one means. */
export type ManifestDecisionKind = 'unchanged' | 'use_pending' | 'apply' | 'suspend';

/** A decision, with the changes it was made from, so keeping it doesn't compare again. */
export interface ManifestDecision {
  kind: ManifestDecisionKind;
  changes: AppManifestChange[];
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
 * This is what Ghost would do with a manifest it picked up by itself; an approval applies a
 * `suspend` rather than letting it wait.
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
