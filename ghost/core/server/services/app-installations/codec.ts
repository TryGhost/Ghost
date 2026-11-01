import { z } from 'zod';
import { DbAppInstallation, DbAppInstallationManifest } from './schema';

/** The installation's own columns that it's read with. */
export const InstallationFields = DbAppInstallation.pick({
  id: true,
  app_id: true,
  status: true,
  manifest_id: true,
  pending_manifest_id: true,
  revision: true,
  created_at: true,
  updated_at: true,
});

/** The approved manifest's columns that an installation is read with. */
export const ApprovedManifestFields = DbAppInstallationManifest.pick({
  manifest_url: true,
  manifest: true,
  icon_svg: true,
});

/**
 * An installation joined with its approved manifest, as the repository reads it. Decoding
 * converts the dates, the status and the manifest JSON.
 */
export const InstallationRow = z.object({
  ...InstallationFields.shape,
  ...ApprovedManifestFields.shape,
});

/** An installation with its approved manifest. Loaded manifests are compared against it. */
export type Installation = z.output<typeof InstallationRow>;

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

/** An installation, with its history when it's read with it. */
export type InstallationWithHistory = Installation & {
  /** Newest first. */
  history?: AppInstallationHistoryEntry[];
};
