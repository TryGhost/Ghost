import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import {
  getSettingValue,
  isSettingReadOnly,
  useEditSettings,
  type Setting,
} from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import {
  getPageNavigationPlacement,
  pagePathForSlug,
  parseSiteNavigation,
  updatePageNavigation,
  type NavigationPlacement,
} from '@tryghost/admin-x-framework/helpers';
import { useCallback, useMemo } from 'react';
import { EDITOR_REQUEST_OPTIONS } from '@/editor/request-options';
import { useEditorSettings } from '@/editor/use-editor-settings';

export interface PublishNavigation {
  /** Where the page is listed now. */
  placement: NavigationPlacement;
  /** Lists the page at `placement` in the latest menus; rejects when the settings save fails. */
  place: (placement: NavigationPlacement) => Promise<void>;
}

function readMenus(settings: Setting[] | undefined) {
  if (
    isSettingReadOnly(settings, 'navigation') ||
    isSettingReadOnly(settings, 'secondary_navigation')
  ) {
    return null;
  }
  const navigation = parseSiteNavigation(getSettingValue(settings, 'navigation'));
  const secondaryNavigation = parseSiteNavigation(
    getSettingValue(settings, 'secondary_navigation'),
  );
  return navigation && secondaryNavigation ? { navigation, secondaryNavigation } : null;
}

/**
 * The site navigation placement of the page being edited. Null while the menus
 * are unreadable or read-only, or before the page has a slug. `getPage` is read
 * when placing, so the label and URL are the ones the publish saved.
 */
export function usePublishNavigation(
  slug: string,
  getPage: () => { title: string; slug: string },
): PublishNavigation | null {
  const { data: settingsData, refetch: refetchSettings } = useEditorSettings();
  const { data: configData } = useBrowseConfig({
    defaultErrorHandler: false,
    requestOptions: EDITOR_REQUEST_OPTIONS,
  });
  const { data: siteData } = useBrowseSite({ requestOptions: EDITOR_REQUEST_OPTIONS });
  const { mutateAsync: editSettings } = useEditSettings();
  // Older backends send no page routes, so pages keep their slug URLs.
  const pageRoutes = configData?.config.pageRoutes;
  const siteUrl = siteData?.site.url;
  const menus = useMemo(() => readMenus(settingsData?.settings), [settingsData]);
  const path = pagePathForSlug(slug, pageRoutes);

  const place = useCallback(
    async (placement: NavigationPlacement) => {
      // Both menus are written whole, so the write starts from the latest copy.
      const { data } = await refetchSettings({ throwOnError: true });
      const latest = readMenus(data?.settings);
      if (!latest) {
        throw new Error('Site navigation is unavailable.');
      }
      const page = getPage();
      const result = updatePageNavigation(
        latest.navigation,
        latest.secondaryNavigation,
        [{ label: page.title, path: pagePathForSlug(page.slug, pageRoutes) }],
        placement,
        siteUrl,
        pageRoutes,
      );
      if (result.changed) {
        await editSettings([
          { key: 'navigation', value: JSON.stringify(result.navigation) },
          { key: 'secondary_navigation', value: JSON.stringify(result.secondaryNavigation) },
        ]);
      }
    },
    [editSettings, getPage, pageRoutes, refetchSettings, siteUrl],
  );

  return useMemo(
    () =>
      menus && path && configData && siteData
        ? {
            placement: getPageNavigationPlacement(
              menus.navigation,
              menus.secondaryNavigation,
              path,
              siteUrl,
              pageRoutes,
            ),
            place,
          }
        : null,
    [configData, menus, pageRoutes, path, place, siteData, siteUrl],
  );
}
