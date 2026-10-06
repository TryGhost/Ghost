import { useEffect } from 'react';
import { fetchManifest } from '@/apps/lib/manifest';
import { getInstallation, updateInstallationManifest } from '@/apps/lib/installations';
import type { AppInstallation } from '@/apps/types';

/**
 * Re-fetches each installed app's manifest when Admin loads, and applies the
 * valid ones (BER-3990). Invalid or unreachable manifests leave the last valid
 * one in place. A rough stand-in for the server-side refresh the issue asks for.
 */
export function useRefreshInstalledManifests(installations: AppInstallation[], enabled: boolean) {
  const ids = installations.map((installation) => installation.id).join(',');

  useEffect(() => {
    if (!enabled || !ids) {
      return;
    }
    for (const id of ids.split(',')) {
      const installation = getInstallation(id);
      if (!installation) {
        continue;
      }
      void fetchManifest(installation.manifestUrl).then((result) => {
        if (result.ok) {
          updateInstallationManifest(id, result.manifest);
        }
      });
    }
    // Once per page load, not on every change to the list.
  }, [enabled]);
}
