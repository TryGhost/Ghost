import { z } from 'zod';
import type { AppManifest } from '@tryghost/app-contracts/manifest';
import type { AppInstallationHistoryEntry, InstallationWithHistory } from './codec';
import { AppInstallationStatus } from './schema';
import type { AppSession } from './service';

const AppInstallationResource = z.object({
  id: z.string(),
  app_id: z.string(),
  status: AppInstallationStatus,
  revision: z.number(),
  manifest_url: z.string(),
  // It was checked when it was read, and parsing it again could rewrite its URLs.
  manifest: z.custom<AppManifest>(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  history: z.array(z.custom<AppInstallationHistoryEntry>()).optional(),
});

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = z.output<typeof AppInstallationResource>;

const AppInstallationsResponse = z.object({
  app_installations: z.array(AppInstallationResource),
});
const AppSessionsResponse = z.object({
  app_sessions: z.tuple([z.object({ installation: AppInstallationResource })]),
});

export const toAppInstallationsResponse = z
  .array(z.custom<InstallationWithHistory>())
  .transform((installations): z.input<typeof AppInstallationsResponse> => ({
    app_installations: installations,
  }))
  .pipe(AppInstallationsResponse);

export const toAppSessionsResponse = z
  .custom<AppSession>()
  .transform((session): z.input<typeof AppSessionsResponse> => ({ app_sessions: [session] }))
  .pipe(AppSessionsResponse);
