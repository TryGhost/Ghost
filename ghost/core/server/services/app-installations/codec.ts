import { z } from 'zod';
import { DbAppInstallation, DbAppInstallationManifest } from './schema';

/**
 * An installation joined with its approved manifest, as the repository reads it. Decoding
 * converts the dates, the status and the manifest JSON.
 */
export const InstallationRow = z.object({
  ...DbAppInstallation.pick({
    id: true,
    app_id: true,
    status: true,
    manifest_id: true,
    pending_manifest_id: true,
    revision: true,
    created_at: true,
    updated_at: true,
  }).shape,
  ...DbAppInstallationManifest.pick({ manifest_url: true, manifest: true }).shape,
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

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = Pick<
  Installation,
  | 'id'
  | 'app_id'
  | 'status'
  | 'revision'
  | 'manifest_url'
  | 'manifest'
  | 'created_at'
  | 'updated_at'
> & {
  /** Newest first. Only included when read with `include=history`. */
  history?: AppInstallationHistoryEntry[];
};
