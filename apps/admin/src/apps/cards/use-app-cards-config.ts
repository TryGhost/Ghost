import { useMemo } from 'react';
import { useBrowseAppInstallations } from '@tryghost/admin-x-framework/api/app-installations';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { canSeeApps } from '@/apps/permissions';
import { buildAppCardsConfig } from './app-cards-config';
import type { AppCardsConfig } from './types';

/**
 * The installed apps' cards for the editor, behind the `apps` Labs flag, for the staff who can
 * manage apps. Refetched when the window regains focus, so an app installed or uninstalled in
 * another tab shows in the card menu, and its saved cards as available or not.
 */
export function useAppCardsConfig(): AppCardsConfig | undefined {
  const enabled = useFeatureFlag('apps');
  const { data: currentUser } = useCurrentUser();
  const visible = canSeeApps(currentUser, enabled);
  const { data: installations } = useBrowseAppInstallations({
    enabled: visible,
    defaultErrorHandler: false,
    refetchOnWindowFocus: 'always',
  });
  const { data: site } = useBrowseSite({ enabled: visible, defaultErrorHandler: false });
  const { data: settings } = useBrowseSettings({ enabled: visible, defaultErrorHandler: false });

  return useMemo(() => {
    if (!visible || !installations || !site || !settings) {
      return undefined;
    }
    const siteOrigins = [...new Set([new URL(site.site.url).origin, window.location.origin])];
    return buildAppCardsConfig({
      installations: installations.app_installations,
      site: {
        url: site.site.url,
        title: site.site.title,
        locale: site.site.locale,
        timezone: getSiteTimezone(settings.settings),
      },
      siteOrigins,
    });
  }, [visible, installations, site, settings]);
}
