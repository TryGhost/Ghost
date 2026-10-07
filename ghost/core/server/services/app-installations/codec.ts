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

/**
 * A manifest an installation ran or was asked to approve. Together with staff history,
 * these are the app's history: installed, updated, suspended, approved.
 */
export const AppInstallationManifestRow = DbAppInstallationManifest.pick({
  id: true,
  manifest_url: true,
  manifest: true,
  requires_approval: true,
  created_at: true,
});

export type AppInstallationManifest = z.output<typeof AppInstallationManifestRow>;

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = z.output<typeof AppInstallationRow> & {
  /** Only when asked for: every manifest the installation has run or been asked to approve, newest first. */
  manifests?: AppInstallationManifest[];
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
