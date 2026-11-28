import type { AppManifest, ManifestChange } from '@tryghost/app-contracts';
import { z } from 'zod';
import { createMutation, createQuery, createQueryWithId } from '../utils/api/hooks';

export type { AppManifest } from '@tryghost/app-contracts';

/** `suspended` waits for an Administrator to approve changes to the app. */
export type AppInstallationStatus = 'active' | 'suspended' | 'uninstalled';

/** One site's approval of one app, with the manifest it was approved with. */
export interface AppInstallation {
  id: string;
  app_id: string;
  status: AppInstallationStatus;
  /** Increments with every change to the installation, so a session can tell it has ended. */
  revision: number;
  manifest_url: string;
  manifest: AppManifest;
  icon_data_url: string | null;
  created_at: string;
  updated_at: string | null;
  /** Newest first. Only included when read with `include=history`. */
  history?: AppInstallationHistoryEntry[];
}

/**
 * `actor` is null when Ghost made the change itself.
 * It's also null when there's no record of who installed the app.
 *
 * `resumed` means a suspended app reverted to its approved manifest, so the changes that were
 * waiting for approval are no longer pending.
 */
export interface AppInstallationHistoryEntry {
  id: string;
  event: 'installed' | 'updated' | 'suspended' | 'resumed' | 'changes_approved' | 'uninstalled';
  actor: { id: string; name: string | null } | null;
  created_at: string;
  /** The host the app moved to. Only set when an approval moved the app. */
  moved_to?: string;
  /**
   * What the entry changed, as Ghost stored it with the manifest: fields, then scopes. A
   * suspension lists what waits for approval. Left out when nothing changed.
   */
  changes?: ManifestChange[];
}

/** What a publisher reviews before installing an app, or before approving changes to one. */
export interface AppInstallationPreview {
  manifest_url: string;
  manifest: AppManifest;
  /** Sent back when confirming, so only the manifest that was reviewed gets installed. */
  digest: string;
  icon_data_url: string | null;
  /**
   * The app's origin, if the site's configuration trusts it, so Ghost didn't ask it to prove it
   * holds the app's key. Empty when it proved it. An app is one origin, so there's at most one.
   */
  trusted_origins: string[];
  /** The site's installation of the same app, if it has one. */
  installation: PreviewedInstallation | null;
}

/**
 * The site's installation of an app as a preview shows it: the manifest it was approved with and
 * where that was read from, and what approving the preview would change.
 */
export interface PreviewedInstallation {
  id: string;
  status: AppInstallationStatus;
  /** Sent back when approving, so the changes approved are the ones that were reviewed. */
  revision: number;
  manifest_url: string;
  manifest: AppManifest;
  icon_data_url: string | null;
  /**
   * Field changes by path, such as `surfaces[0].url`, or `manifest_url` when the app moved,
   * then scope changes in the registry's order.
   */
  changes: ManifestChange[];
}

/** The preview of a suspended installation's pending manifest. */
export type ApprovalPreview = AppInstallationPreview & {
  installation: PreviewedInstallation;
};

export interface AppInstallationsResponseType {
  app_installations: AppInstallation[];
}

/**
 * The token Admin sends the app's Admin API calls with, as `Authorization: Bearer`. It acts for
 * the staff user within the installation's approved scopes. Only Admin holds it; the app's frame
 * never sees it.
 */
export const AppSessionTokenSchema = z.object({
  access_token: z.string().min(1),
  /** How long it lasts, in seconds from when Ghost answered */
  expires_in: z.number().positive(),
});

export type AppSessionToken = z.infer<typeof AppSessionTokenSchema>;

// Only the status is checked: it decides whether a session comes with a token. The rest of the
// installation is read as the other installation hooks read it.
const installationWithStatus = <Status extends AppInstallationStatus>(
  statuses: readonly Status[],
) =>
  z.custom<AppInstallation & { status: Status }>(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      (statuses as readonly unknown[]).includes((value as { status?: unknown }).status),
  );

/** A session of an active installation, which always comes with a token. */
const ActiveAppSessionSchema = z.object({
  installation: installationWithStatus(['active']),
  token: AppSessionTokenSchema,
  preview: z.null(),
});

/**
 * A session of an installation that isn't active: it gets no token, and the app doesn't load. A
 * suspended one comes with the preview of what waits for approval, read as the preview endpoint's
 * is.
 */
const InactiveAppSessionSchema = z.object({
  installation: installationWithStatus(['suspended', 'uninstalled']),
  token: z.null(),
  preview: z
    .custom<ApprovalPreview>((value) => typeof value === 'object' && value !== null)
    .nullable(),
});

export type ActiveAppSession = z.infer<typeof ActiveAppSessionSchema>;
export type InactiveAppSession = z.infer<typeof InactiveAppSessionSchema>;

/**
 * One session of an installed app: the installation as Ghost returned it after re-checking the
 * app's manifest, and for an active one the token its calls are sent with. The session is pinned
 * to that installation's revision, and ends once the revision changes.
 */
export type AppSession = ActiveAppSession | InactiveAppSession;

export function isActiveAppSession(session: AppSession | undefined): session is ActiveAppSession {
  return session?.installation.status === 'active';
}

const AppSessionsResponseSchema = z.object({
  app_sessions: z.array(z.union([ActiveAppSessionSchema, InactiveAppSessionSchema])),
});

export type AppSessionsResponseType = z.infer<typeof AppSessionsResponseSchema>;

const AppTokensResponseSchema = z.object({
  app_tokens: z.array(AppSessionTokenSchema),
});

export type AppTokensResponseType = z.infer<typeof AppTokensResponseSchema>;

export interface AppInstallationPreviewsResponseType {
  app_installation_previews: AppInstallationPreview[];
}

/** What confirming sends: the manifest's address, and the digest of the version reviewed. */
export interface ReviewedAppManifest {
  manifest_url: string;
  digest: string;
}

const dataType = 'AppInstallationsResponseType';
// These also add entries to staff history.
// Refetch it so Settings › History stays up to date.
const changedDataTypes = { dataType: [dataType, 'ActionsResponseType'] };

export const useBrowseAppInstallations = createQuery<AppInstallationsResponseType>({
  dataType,
  path: '/apps/installations/',
});

/**
 * Unlike `useBrowseAppInstallations`, this also returns uninstalled apps.
 * That way their details page still loads.
 */
export const useReadAppInstallation = createQueryWithId<AppInstallationsResponseType>({
  dataType,
  path: (id) => `/apps/installations/${id}/`,
  defaultSearchParams: { include: 'history' },
});

/**
 * Starts a session of an installed app. Opening the app's page does this. Ghost first re-checks the
 * app's manifest: a change that needs no approval is applied, and one that needs approval suspends
 * the app. Ghost then returns the current installation, with the preview of its pending manifest
 * when it's suspended, and only that response decides what the app's page shows. The session ends
 * when the installation's revision changes from the one in the response. For an app that isn't
 * installed, Ghost returns 404 with the code `APP_NOT_INSTALLED`.
 */
export const useStartAppSession = createMutation<AppSessionsResponseType, string>({
  method: 'POST',
  path: (id) => `/apps/installations/${id}/sessions/`,
  parseResponse: (data) => AppSessionsResponseSchema.parse(data),
  invalidateQueries: { dataType },
});

/**
 * Creates a new token for a session that started at `revision`, which renews it without
 * re-checking the manifest. The token has the same shape as a started session's. Ghost answers
 * 409 with `APP_SESSION_ENDED` when the installation was suspended or changed since the session
 * started, and 404 with `APP_NOT_INSTALLED` once it's uninstalled; either ends the session.
 */
export const useCreateAppToken = createMutation<
  AppTokensResponseType,
  { id: string; revision: number }
>({
  method: 'POST',
  path: ({ id }) => `/apps/installations/${id}/tokens/`,
  body: ({ revision }) => ({ app_tokens: [{ revision }] }),
  parseResponse: (data) => AppTokensResponseSchema.parse(data),
  // Every app call refused for its token waits on the renewal, so a stalled one mustn't hold
  // them. The token holder backs off and retries itself.
  timeout: 10_000,
  retry: false,
});

export const useAddAppInstallation = createMutation<
  AppInstallationsResponseType,
  ReviewedAppManifest
>({
  method: 'POST',
  path: () => '/apps/installations/',
  body: (reviewed) => ({ app_installations: [reviewed] }),
  invalidateQueries: changedDataTypes,
});

/**
 * Approves an installed app's pending manifest, or the app at a new manifest URL. `revision`
 * is the installation's, as the preview showed it. Ghost fetches the manifest again, and refuses
 * the approval with an outdated review's code if the app or the installation changed since.
 */
export const useApproveAppInstallation = createMutation<
  AppInstallationsResponseType,
  ReviewedAppManifest & { id: string; revision: number }
>({
  method: 'PUT',
  path: ({ id }) => `/apps/installations/${id}/`,
  body: ({ id: _id, ...reviewed }) => ({ app_installations: [reviewed] }),
  invalidateQueries: changedDataTypes,
});

export const useUninstallAppInstallation = createMutation<unknown, string>({
  method: 'DELETE',
  path: (id) => `/apps/installations/${id}/`,
  invalidateQueries: changedDataTypes,
});
