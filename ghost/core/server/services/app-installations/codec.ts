import { z } from 'zod';
import { DbAppInstallation, DbAppInstallationManifest, type AppInstallationStatus } from './schema';

/**
 * An installation joined with its approved manifest. The read query and the Admin API use
 * the same field names; decoding converts the dates, the status and the manifest JSON.
 */
export const AppInstallationRow = z.object({
  ...DbAppInstallation.pick({
    id: true,
    app_id: true,
    status: true,
    revision: true,
    created_at: true,
    updated_at: true,
  }).shape,
  ...DbAppInstallationManifest.pick({ manifest_url: true, manifest: true }).shape,
});

export interface HistoryActor {
  id: string;
  /** Null if the user has been deleted. */
  name: string | null;
}

/**
 * `actor` is null for changes the re-check made, and when there's no record of who
 * installed the app.
 */
export interface AppInstallationHistoryEntry {
  id: string;
  event: 'installed' | 'updated' | 'suspended' | 'resumed' | 'changes_approved' | 'uninstalled';
  actor: HistoryActor | null;
  created_at: Date;
  /** The host the app moved to. Only set when an approval moved the app. */
  moved_to?: string;
}

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = z.output<typeof AppInstallationRow> & {
  /** Newest first. Only included when read with `include=history`. */
  history?: AppInstallationHistoryEntry[];
};

const CurrentInstallationColumns = z.object({
  ...DbAppInstallation.pick({
    id: true,
    app_id: true,
    status: true,
    manifest_id: true,
    pending_manifest_id: true,
    revision: true,
  }).shape,
  ...DbAppInstallationManifest.pick({ manifest_url: true, manifest: true }).shape,
  pending_digest: DbAppInstallationManifest.shape.digest.nullable(),
});

type Installed = Omit<
  z.output<typeof CurrentInstallationColumns>,
  'status' | 'pending_manifest_id' | 'pending_digest'
>;

export type ActiveInstallation = Installed & { status: 'active' };

export type SuspendedInstallation = Installed & {
  status: 'suspended';
  pending: { id: string; digest: string };
};

/**
 * An app's installation that hasn't been uninstalled, with its approved manifest and, while
 * it's suspended, the pending one's ID and digest. Loaded manifests are compared against it.
 */
export type CurrentInstallation = ActiveInstallation | SuspendedInstallation;

/** Why a row isn't a current installation, for the log of whoever repairs it. */
function mismatch(status: AppInstallationStatus, pendingId: string | null): string {
  switch (status) {
    case 'active':
      return `An active installation can't have a pending manifest, but has ${pendingId}.`;
    case 'suspended':
      return pendingId === null
        ? 'A suspended installation needs a pending manifest.'
        : `The suspended installation's pending manifest ${pendingId} doesn't exist.`;
    case 'uninstalled':
      return "An uninstalled installation isn't current.";
  }
}

/**
 * An installation is suspended exactly while a manifest is pending, so a row where the two
 * disagree doesn't decode.
 */
export const CurrentInstallationRow = CurrentInstallationColumns.transform(
  (
    { status, pending_manifest_id: pendingId, pending_digest: pendingDigest, ...installation },
    ctx,
  ): CurrentInstallation => {
    if (status === 'active' && pendingId === null) {
      return { ...installation, status };
    }
    if (status === 'suspended' && pendingId !== null && pendingDigest !== null) {
      return { ...installation, status, pending: { id: pendingId, digest: pendingDigest } };
    }
    ctx.issues.push({ code: 'custom', message: mismatch(status, pendingId), input: status });
    return z.NEVER;
  },
);
