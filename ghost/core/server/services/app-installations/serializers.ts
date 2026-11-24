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
  icon_data_url: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date().nullable(),
  history: z.array(z.custom<AppInstallationHistoryEntry>()).optional(),
});

/** One site's approval of one app, as the Admin API returns it. */
export type AppInstallation = z.output<typeof AppInstallationResource>;

const AppInstallationsResponse = z.object({
  app_installations: z.array(AppInstallationResource),
});
/**
 * The user token Admin sends for the app, as `Authorization: Bearer`. It acts for the staff
 * user within the installation's approved scopes, and is bound to their staff session.
 *
 * Admin's alone: it never reaches the app's frame. Session start and renewal return the same
 * shape.
 */
export const AppSessionTokenResource = z.object({
  access_token: z.string(),
  /** Seconds from when Ghost answered, so the browser's clock doesn't matter */
  expires_in: z.number().int().positive(),
});

export type AppSessionToken = z.output<typeof AppSessionTokenResource>;

const AppSessionsResponse = z.object({
  app_sessions: z.tuple([
    z.object({
      installation: AppInstallationResource,
      token: AppSessionTokenResource.nullable(),
    }),
  ]),
});

const AppTokensResponse = z.object({
  app_tokens: z.tuple([AppSessionTokenResource]),
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

export const toAppTokensResponse = z
  .custom<AppSessionToken>()
  .transform((token): z.input<typeof AppTokensResponse> => ({ app_tokens: [token] }))
  .pipe(AppTokensResponse);
