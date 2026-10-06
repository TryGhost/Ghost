import type { AppManifest } from '@tryghost/app-contracts';
import { createMutation, createQuery } from '../utils/api/hooks';

export type { AppManifest } from '@tryghost/app-contracts';

/** `suspended` waits for an Administrator to approve changes to the app. */
export type AppInstallationStatus = 'active' | 'suspended' | 'uninstalled';

/** One site's approval of one app, with the manifest it was approved with. */
export interface AppInstallation {
  id: string;
  app_id: string;
  status: AppInstallationStatus;
  manifest_url: string;
  manifest: AppManifest;
  created_at: string;
  updated_at: string | null;
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
   * The site's installation of the same app, if it has one: the manifest it was approved
   * with and where that was read from, and what would change.
   */
  installation: {
    id: string;
    status: AppInstallationStatus;
    manifest_url: string;
    manifest: AppManifest;
    changes: AppManifestChange[];
  } | null;
}

export interface AppInstallationsResponseType {
  app_installations: AppInstallation[];
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

export const useBrowseAppInstallations = createQuery<AppInstallationsResponseType>({
  dataType,
  path: '/apps/installations/',
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

export const useAddAppInstallation = createMutation<
  AppInstallationsResponseType,
  ReviewedAppManifest
>({
  method: 'POST',
  path: () => '/apps/installations/',
  body: (reviewed) => ({ app_installations: [reviewed] }),
  invalidateQueries: { dataType },
});

/** Approves changes to an installed app, including the app moving somewhere new. */
export const useApproveAppInstallation = createMutation<
  AppInstallationsResponseType,
  ReviewedAppManifest & { id: string }
>({
  method: 'PUT',
  path: ({ id }) => `/apps/installations/${id}/`,
  body: ({ id: _id, ...reviewed }) => ({ app_installations: [reviewed] }),
  invalidateQueries: { dataType },
});
