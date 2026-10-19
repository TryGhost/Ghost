import { compareManifests } from '@tryghost/app-contracts/manifest';
import type { CurrentInstallation, SuspendedInstallation } from './codec';
import type { LoadedManifest } from './load-manifest';

/** One field that differs from what the publisher approved. */
export interface AppManifestChange {
  /** Where the change is: a path in the manifest, or `manifest_url` when the app moved. */
  path: string;
  requires_approval: boolean;
}

function compareWithApproved(installation: CurrentInstallation, manifest: LoadedManifest) {
  return compareManifests(
    { manifestUrl: installation.manifest_url, manifest: installation.manifest },
    { manifestUrl: manifest.manifestUrl, manifest: manifest.manifest },
  );
}

/**
 * Lists what differs between the approved manifest and an incoming one. The preview shows
 * this list, and transitions are decided from the same comparison, so a review always matches
 * what happens.
 */
export function changesFrom(
  installation: CurrentInstallation,
  manifest: LoadedManifest,
): AppManifestChange[] {
  return compareWithApproved(installation, manifest).changes.map(({ path, requiresApproval }) => ({
    path,
    requires_approval: requiresApproval,
  }));
}

/** How an incoming manifest differs from the approved one. */
type Difference = 'none' | 'silent' | 'requires_approval';

function differenceFromApproved(
  installation: CurrentInstallation,
  manifest: LoadedManifest,
): Difference {
  const { changes, requiresApproval } = compareWithApproved(installation, manifest);
  if (requiresApproval) {
    return 'requires_approval';
  }
  return changes.length > 0 ? 'silent' : 'none';
}

/**
 * What happens to an installation: an app session's re-check fetches its manifest, a
 * publisher approves a manifest they reviewed, or a publisher uninstalls the app.
 */
export type InstallationEvent =
  | { type: 'recheck' | 'approve'; manifest: LoadedManifest }
  | { type: 'uninstall' };

/** The incoming manifest, and how a transition stores it in a new row. */
export interface NewManifestRow {
  manifest: LoadedManifest;
  source: 'approval' | 'update' | 'resume';
  /** Whether it had changes that needed approval. */
  requiresApproval: boolean;
}

/**
 * Where an event takes an installation, and what its approved manifest is there:
 * - `same`: nowhere. Nothing is written.
 * - `active` with `stores`: the incoming manifest, stored as a new row.
 * - `active` with `approvedManifestId`: a manifest row the installation already has.
 * - `suspended`: stores the incoming manifest as the pending one, replacing any, and keeps the
 *   approved one.
 * - `uninstalled`: ends the installation.
 *
 * Nothing is left pending in `active`. Every transition but `same` increments the revision.
 */
export type Transition =
  | { to: 'same' }
  | { to: 'active'; approvedManifestId: string }
  | { to: 'active' | 'suspended'; stores: NewManifestRow }
  | { to: 'uninstalled' };

const SAME: Transition = { to: 'same' };

/**
 * Where an event takes an installation that hasn't been uninstalled. An installation is
 * suspended exactly while a pending manifest waits for approval. Uninstalled is final, so it
 * has no transitions: the store refuses events for an uninstalled installation.
 */
export function transition(
  installation: CurrentInstallation,
  event: { type: 'uninstall' },
): { to: 'uninstalled' };
export function transition(installation: CurrentInstallation, event: InstallationEvent): Transition;
export function transition(
  installation: CurrentInstallation,
  event: InstallationEvent,
): Transition {
  if (event.type === 'uninstall') {
    return { to: 'uninstalled' };
  }
  const { type, manifest } = event;
  if (installation.status === 'active') {
    const difference = differenceFromApproved(installation, manifest);
    return type === 'recheck'
      ? recheckActive(difference, manifest)
      : approveActive(difference, manifest);
  }
  // The pending manifest again. The digest covers the manifest and its URL, so the digests
  // match. A re-check leaves it waiting, and approving it runs the row it already has.
  if (manifest.digest === installation.pending.digest) {
    return type === 'recheck'
      ? SAME
      : { to: 'active', approvedManifestId: installation.pending.id };
  }
  const difference = differenceFromApproved(installation, manifest);
  return type === 'recheck'
    ? recheckSuspended(difference, manifest)
    : approveSuspended(installation, difference, manifest);
}

/** Re-checking adopts silent changes, and suspends the installation for any others. */
function recheckActive(difference: Difference, manifest: LoadedManifest): Transition {
  switch (difference) {
    case 'none':
      return SAME;
    case 'silent':
      return { to: 'active', stores: { manifest, source: 'update', requiresApproval: false } };
    case 'requires_approval':
      return { to: 'suspended', stores: { manifest, source: 'update', requiresApproval: true } };
  }
}

/**
 * Re-checking replaces the pending manifest with different changes that need approval. A
 * manifest without any means the app reverted the pending changes, which resumes the
 * installation. No person made that change, so its `resume` row is the only record of it.
 */
function recheckSuspended(difference: Difference, manifest: LoadedManifest): Transition {
  switch (difference) {
    case 'requires_approval':
      return { to: 'suspended', stores: { manifest, source: 'update', requiresApproval: true } };
    case 'none':
    case 'silent':
      return { to: 'active', stores: { manifest, source: 'resume', requiresApproval: false } };
  }
}

/** Approving the approved manifest changes nothing. Any other becomes the approved one. */
function approveActive(difference: Difference, manifest: LoadedManifest): Transition {
  switch (difference) {
    case 'none':
      return SAME;
    case 'silent':
      return { to: 'active', stores: { manifest, source: 'approval', requiresApproval: false } };
    case 'requires_approval':
      return { to: 'active', stores: { manifest, source: 'approval', requiresApproval: true } };
  }
}

/**
 * Approving always resumes the installation. Approving the approved manifest runs the row it
 * already has, and the staff history records the approval.
 */
function approveSuspended(
  installation: SuspendedInstallation,
  difference: Difference,
  manifest: LoadedManifest,
): Transition {
  switch (difference) {
    case 'none':
      return { to: 'active', approvedManifestId: installation.manifest_id };
    case 'silent':
      return { to: 'active', stores: { manifest, source: 'approval', requiresApproval: false } };
    case 'requires_approval':
      return { to: 'active', stores: { manifest, source: 'approval', requiresApproval: true } };
  }
}
