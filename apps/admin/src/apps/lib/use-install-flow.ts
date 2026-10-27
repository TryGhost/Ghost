import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import {
  type AppInstallation,
  type AppInstallationPreview,
  type AppInstallationPreviewsResponseType,
  useAddAppInstallation,
  useApproveAppInstallation,
} from '@tryghost/admin-x-framework/api/app-installations';

const previewKey = (manifestUrl: string | null) => ['AppInstallationPreview', manifestUrl];

/**
 * The install link's flow: Ghost fetches and checks the app's manifest for a review, and
 * confirming installs or approves exactly the version reviewed.
 *
 * The preview is a query keyed on the manifest's address, although Ghost answers it on a
 * POST: react-query then de-duplicates the fetch and keeps a slow answer from replacing a
 * newer one. It is never stale on its own, since only confirming decides freshness.
 */
export function useInstallFlow(manifestUrl: string | null) {
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();
  const install = useAddAppInstallation();
  const approve = useApproveAppInstallation();

  const preview = useQuery<AppInstallationPreview>({
    queryKey: previewKey(manifestUrl),
    enabled: manifestUrl !== null,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const response = await fetchApi<AppInstallationPreviewsResponseType>(
        apiUrl('/apps/installations/preview/'),
        {
          method: 'POST',
          body: JSON.stringify({ app_installation_previews: [{ manifest_url: manifestUrl }] }),
        },
      );
      return response.app_installation_previews[0];
    },
  });

  return {
    preview,
    /** Has Ghost fetch and check the app again. */
    reload: () => preview.refetch(),
    /** Takes the review Ghost sent back instead, when confirming found a newer version. */
    replace: (next: AppInstallationPreview) =>
      queryClient.setQueryData(previewKey(manifestUrl), next),
    /**
     * Installs, or approves changes to the site's installation, as reviewed. Returns the
     * new installation on a fresh install, so the app can be opened.
     */
    confirm: async (reviewed: AppInstallationPreview): Promise<AppInstallation | undefined> => {
      const manifest = { manifest_url: reviewed.manifest_url, digest: reviewed.digest };
      if (reviewed.installation) {
        const { id, revision } = reviewed.installation;
        await approve.mutateAsync({ id, revision, ...manifest });
        return undefined;
      }
      const response = await install.mutateAsync(manifest);
      return response.app_installations[0];
    },
    isConfirming: install.isPending || approve.isPending,
  };
}
