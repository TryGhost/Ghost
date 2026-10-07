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

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = z.output<typeof AppInstallationRow>;
