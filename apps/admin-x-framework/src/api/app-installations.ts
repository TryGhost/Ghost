import type { AppManifest, ManifestChange } from '@tryghost/app-contracts';
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
  /**
   * The site's installation of the same app, if it has one: the manifest it was approved
   * with and where that was read from, and what would change.
   */
  installation: {
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
  } | null;
}

export interface AppInstallationsResponseType {
  app_installations: AppInstallation[];
}

/**
 * The token Admin sends the app's Admin API calls with, as `Authorization: Bearer`. It acts for
 * the staff user within the installation's approved scopes. Only Admin holds it; the app's frame
 * never sees it.
 */
export interface AppSessionToken {
  access_token: string;
  /** How long it lasts, in seconds from when Ghost answered */
  expires_in: number;
}

/**
 * One session of an installed app: the installation as Ghost returned it after re-checking the
 * app's manifest, and for an active one the token its calls are sent with. The session is pinned
 * to that installation's revision, and ends once the revision changes.
 */
export type AppSession = ActiveAppSession | InactiveAppSession;

/** A session of an active installation, which always comes with a token. */
export interface ActiveAppSession {
  installation: AppInstallation & { status: 'active' };
  token: AppSessionToken;
}

/** A session of an installation that isn't active: it gets no token, and the app doesn't load. */
export interface InactiveAppSession {
  installation: AppInstallation & { status: Exclude<AppInstallationStatus, 'active'> };
  token: null;
}

export function isActiveAppSession(session: AppSession | undefined): session is ActiveAppSession {
  return session?.installation.status === 'active';
}

export interface AppSessionsResponseType {
  app_sessions: AppSession[];
}

export interface AppTokensResponseType {
  app_tokens: AppSessionToken[];
}

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
 * the app. Ghost then returns the current installation, and only that response decides whether the
 * app loads. The session ends when the installation's revision changes from the one in the
 * response. For an app that isn't installed, Ghost returns 404 with the code `APP_NOT_INSTALLED`.
 */
export const useStartAppSession = createMutation<AppSessionsResponseType, string>({
  method: 'POST',
  path: (id) => `/apps/installations/${id}/sessions/`,
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
 * Approves changes to an installed app, including the app moving somewhere new. `revision`
 * is the installation's, as the preview showed it: Ghost refuses the approval if the
 * installation changed since.
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
