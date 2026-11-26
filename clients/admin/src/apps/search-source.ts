import { useMemo } from 'react';
import {
  type AppInstallation,
  useBrowseAppInstallations,
} from '@tryghost/admin-x-framework/api/app-installations';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import type { User } from '@tryghost/admin-x-framework/api/users';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import type { SearchItem, SearchSource, SearchSourceContext } from '@/global-search/search-source';
import { canSeeApps } from '@/apps/permissions';
import { type AppsAvailability, installationActions } from '@/apps/lib/installation-actions';
import { useAppsAvailability } from '@/apps/lib/use-apps-availability';

export const APPS_SEARCH_HEADING = 'Apps';

/**
 * Installed apps, in the Apps list's order. A suspended app opens its review, as in the sidebar.
 * Every item opens an app, so there are none where apps can't be opened.
 */
export function appsSearchItems(
  user: User | undefined,
  appsEnabled: boolean,
  availability: AppsAvailability,
  installations: readonly AppInstallation[] = [],
): SearchItem[] {
  if (!canSeeApps(user, appsEnabled)) {
    return [];
  }

  return installations.flatMap((installation): SearchItem[] => {
    const { shortcutTo } = installationActions(installation, availability);
    return shortcutTo === null
      ? []
      : [
          {
            kind: 'navigate',
            id: installation.id,
            title: installation.manifest.name,
            to: shortcutTo,
          },
        ];
  });
}

/** Shortcuts to installed apps, for whoever the sidebar shows Apps to. Loads on the first term. */
export function useAppsSearchSource({ enabled }: SearchSourceContext): SearchSource {
  const appsEnabled = useFeatureFlag('apps');
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const availability = useAppsAvailability();
  const canSee = canSeeApps(currentUser, appsEnabled);
  // a failed list drops the group rather than holding up every other result
  const { data, isLoading: isAppsLoading } = useBrowseAppInstallations({
    enabled: enabled && availability === 'supported' && canSee,
    defaultErrorHandler: false,
  });
  // Still loading until it's known whether apps can be opened here, rather than empty
  const isLoading = isUserLoading || isAppsLoading || (canSee && availability === 'loading');
  const installations = data?.app_installations;

  return useMemo(
    () => ({
      id: 'apps',
      heading: APPS_SEARCH_HEADING,
      items: appsSearchItems(currentUser, appsEnabled, availability, installations),
      isLoading,
    }),
    [currentUser, appsEnabled, availability, installations, isLoading],
  );
}
