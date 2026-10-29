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
import { appOpenRoute } from '@/apps/lib/routes';

export const APPS_SEARCH_HEADING = 'Apps';

/** Installed apps, in the Apps list's order. A suspended app opens its review, as in the sidebar. */
export function appsSearchItems(
  user: User | undefined,
  appsEnabled: boolean,
  installations: readonly AppInstallation[] = [],
): SearchItem[] {
  if (!canSeeApps(user, appsEnabled)) {
    return [];
  }

  return installations.map((installation): SearchItem => ({
    kind: 'navigate',
    id: installation.id,
    title: installation.manifest.name,
    to: appOpenRoute(installation),
  }));
}

/** Shortcuts to installed apps, for whoever the sidebar shows Apps to. Loads on the first term. */
export function useAppsSearchSource({ enabled }: SearchSourceContext): SearchSource {
  const appsEnabled = useFeatureFlag('apps');
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  // a failed list drops the group rather than holding up every other result
  const { data, isLoading: isAppsLoading } = useBrowseAppInstallations({
    enabled: enabled && canSeeApps(currentUser, appsEnabled),
    defaultErrorHandler: false,
  });
  const isLoading = isUserLoading || isAppsLoading;
  const installations = data?.app_installations;

  return useMemo(
    () => ({
      id: 'apps',
      heading: APPS_SEARCH_HEADING,
      items: appsSearchItems(currentUser, appsEnabled, installations),
      isLoading,
    }),
    [currentUser, appsEnabled, installations, isLoading],
  );
}
