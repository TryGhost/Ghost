import { z } from 'zod';
import { DbAppInstallation, DbAppInstallationManifest } from './schema';

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

/**
 * An app's installation that hasn't been uninstalled, with its approved manifest. Loaded
 * manifests are compared against it.
 */
export const CurrentInstallationRow = z.object({
  ...DbAppInstallation.pick({
    id: true,
    app_id: true,
    status: true,
    manifest_id: true,
    pending_manifest_id: true,
    revision: true,
  }).shape,
  ...DbAppInstallationManifest.pick({ manifest_url: true, manifest: true }).shape,
});

export type CurrentInstallation = z.output<typeof CurrentInstallationRow>;

/**
 * The pending manifest's digest, which covers the manifest and its URL. A loaded manifest
 * is the pending one when the digests match.
 */
export const PendingManifestRow = DbAppInstallationManifest.pick({ id: true, digest: true });
