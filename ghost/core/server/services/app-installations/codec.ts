import { z } from 'zod';
import { DbAppInstallation, DbAppInstallationManifest } from './schema';

/**
 * An installation joined with the approved manifest it runs, as the read query returns it
 * and as the Admin API returns it. The columns keep their names; decoding is what turns
 * the dates, the status and the manifest text into what the rest of Ghost works with.
 */
export const AppInstallationRow = z.object({
  ...DbAppInstallation.pick({
    id: true,
    app_id: true,
    status: true,
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
 * `actor` is null when Ghost made the change itself.
 * It's also null when there's no record of who installed the app.
 */
export interface AppInstallationHistoryEntry {
  id: string;
  event: 'installed' | 'updated' | 'suspended' | 'changes_approved' | 'uninstalled';
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
 * The current installation of an app, with the manifest it was approved with: what a
 * newer manifest is compared against, and what approving one replaces.
 */
export const CurrentInstallationRow = z.object({
  ...DbAppInstallation.pick({
    id: true,
    status: true,
    manifest_id: true,
    pending_manifest_id: true,
    revision: true,
  }).shape,
  ...DbAppInstallationManifest.pick({ manifest_url: true, manifest: true }).shape,
});

export type CurrentInstallation = z.output<typeof CurrentInstallationRow>;

/**
 * What tells a manifest waiting for approval apart from the one just reviewed: its digest
 * covers the manifest and the address it is read from.
 */
export const PendingManifestRow = DbAppInstallationManifest.pick({ id: true, digest: true });
