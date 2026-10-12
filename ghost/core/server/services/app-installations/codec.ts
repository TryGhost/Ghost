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

/** The staff user who acted. */
export interface HistoryActor {
  id: string;
  /** Null when the user no longer exists. */
  name: string | null;
}

/**
 * One event in an installation's history. `actor` is null when Ghost acted by itself
 * (`updated`, `suspended`), or when who acted wasn't recorded.
 */
export interface AppInstallationHistoryEntry {
  id: string;
  event: 'installed' | 'updated' | 'suspended' | 'changes_approved' | 'uninstalled';
  actor: HistoryActor | null;
  created_at: Date;
  /** On a `changes_approved` entry that moved the app, the host it moved to. */
  moved_to?: string;
}

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = z.output<typeof AppInstallationRow> & {
  /** Newest first. Only when read with `include=history`. */
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

/** What tells a manifest waiting for approval apart from the one just reviewed. */
export const PendingManifestRow = DbAppInstallationManifest.pick({
  id: true,
  manifest_url: true,
  digest: true,
});
