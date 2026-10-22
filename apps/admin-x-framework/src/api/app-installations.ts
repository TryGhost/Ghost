import type { AppManifest } from '@tryghost/app-contracts';
import { createMutation, createQuery, createQueryWithId } from '../utils/api/hooks';

export type { AppManifest } from '@tryghost/app-contracts';

/** `suspended` waits for an Administrator to approve changes to the app. */
export type AppInstallationStatus = 'active' | 'suspended' | 'uninstalled';

/** One site's approval of one app, with the manifest it was approved with. */
export interface AppInstallation {
  id: string;
  app_id: string;
  status: AppInstallationStatus;
  /**
   * Increments with every change to the installation, so a session can tell it has ended. Missing
   * on Ghost versions from before app sessions.
   */
  revision?: number;
  manifest_url: string;
  manifest: AppManifest;
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
}

/** One field that differs from what was approved before. */
export interface AppManifestChange {
  /** A path in the manifest, such as `surfaces[0].url`, or `manifest_url` when the app moved. */
  path: string;
  requires_approval: boolean;
}

/** What a publisher reviews before installing an app, or before approving changes to one. */
export interface AppInstallationPreview {
  manifest_url: string;
  manifest: AppManifest;
  /** Sent back when confirming, so only the manifest that was reviewed gets installed. */
  digest: string;
  /**
   * The app's origins, its manifest's own included, that the site's configuration trusts. Ghost
   * didn't ask these to prove they hold the app's key. Empty when every origin proved it.
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
    changes: AppManifestChange[];
  } | null;
}

export interface AppInstallationsResponseType {
  app_installations: AppInstallation[];
}

/**
 * One session of an installed app: the installation as Ghost returned it after re-checking the
 * app's manifest. The session is pinned to that installation's revision, and ends once the
 * revision changes.
 */
export interface AppSession {
  installation: AppInstallation;
}

export interface AppSessionsResponseType {
  app_sessions: AppSession[];
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

/** The Admin API path for reading one installation, for reads that don't use the hook. */
export const appInstallationPath = (id: string) => `/apps/installations/${id}/`;

/**
 * Unlike `useBrowseAppInstallations`, this also returns uninstalled apps.
 * That way their details page still loads.
 */
export const useReadAppInstallation = createQueryWithId<AppInstallationsResponseType>({
  dataType,
  path: appInstallationPath,
  defaultSearchParams: { include: 'history' },
});

/** Has Ghost fetch and check an app's manifest. Stores nothing, so nothing is invalidated. */
export const usePreviewAppInstallation = createMutation<
  AppInstallationPreviewsResponseType,
  string
>({
  method: 'POST',
  path: () => '/apps/installations/preview/',
  body: (manifestUrl) => ({ app_installation_previews: [{ manifest_url: manifestUrl }] }),
});

/**
 * Starts a session of an installed app. Opening the app's page does this. Ghost first re-checks the
 * app's manifest: a change that needs no approval is applied, and one that needs approval suspends
 * the app. Ghost then returns the current installation, and only that response decides whether the
 * app loads. The session ends when the installation's revision changes from the one in the
 * response. For an app that isn't installed, Ghost returns 404 with the code `APP_NOT_INSTALLED`.
 * Ghost versions from before app sessions return a plain 404.
 */
export const useStartAppSession = createMutation<AppSessionsResponseType, string>({
  method: 'POST',
  path: (id) => `/apps/installations/${id}/sessions/`,
  invalidateQueries: { dataType },
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
