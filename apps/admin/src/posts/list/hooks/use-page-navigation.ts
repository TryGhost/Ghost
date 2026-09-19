import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import {
  getSettingValue,
  isSettingReadOnly,
  useBrowseSettings,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import {
  getPageNavigationPlacement,
  pagePathForSlug,
  updatePageNavigation,
  type NavigationPlacement,
  type SiteNavigationItem,
} from '@tryghost/admin-x-framework/helpers';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { PostListItem } from './use-posts-list';

function readNavigation(value: string | null): SiteNavigationItem[] | null {
  if (value === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          'label' in item &&
          typeof item.label === 'string' &&
          'url' in item &&
          typeof item.url === 'string',
      )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function usePageNavigation() {
  const settings = useBrowseSettings();
  const config = useBrowseConfig();
  const site = useBrowseSite();
  const edit = useEditSettings();
  const busy = useRef(false);
  const [isRunning, setIsRunning] = useState(false);
  const primary = useMemo(
    () => readNavigation(getSettingValue(settings.data?.settings, 'navigation')),
    [settings.data],
  );
  const secondary = useMemo(
    () => readNavigation(getSettingValue(settings.data?.settings, 'secondary_navigation')),
    [settings.data],
  );
  const pageRoutes = config.data?.config.pageRoutes;
  const siteUrl = site.data?.site.url;
  const { refetch: refreshSettings } = settings;
  const { refetch: refreshConfig } = config;
  const { mutateAsync: editSettings } = edit;
  const available = Boolean(
    primary &&
    secondary &&
    site.data &&
    config.data &&
    !isSettingReadOnly(settings.data?.settings, 'navigation') &&
    !isSettingReadOnly(settings.data?.settings, 'secondary_navigation'),
  );

  const placementFor = useCallback(
    (post: PostListItem): NavigationPlacement =>
      post.status === 'published'
        ? getPageNavigationPlacement(
            primary ?? [],
            secondary ?? [],
            pagePathForSlug(post.slug, pageRoutes),
            siteUrl,
            pageRoutes,
          )
        : null,
    [primary, secondary, pageRoutes, siteUrl],
  );

  const update = useCallback(
    async (posts: PostListItem[], placement: NavigationPlacement) => {
      if (
        busy.current ||
        !available ||
        !posts.length ||
        posts.some((post) => post.status !== 'published')
      ) {
        return;
      }
      busy.current = true;
      setIsRunning(true);
      try {
        // Read the current menus and routes before a whole-menu settings write.
        const [freshSettings, freshConfig] = await Promise.all([
          refreshSettings({ throwOnError: true }),
          refreshConfig({ throwOnError: true }),
        ]);
        const navigation = readNavigation(
          getSettingValue(freshSettings.data?.settings, 'navigation'),
        );
        const secondaryNavigation = readNavigation(
          getSettingValue(freshSettings.data?.settings, 'secondary_navigation'),
        );
        if (
          !navigation ||
          !secondaryNavigation ||
          isSettingReadOnly(freshSettings.data?.settings, 'navigation') ||
          isSettingReadOnly(freshSettings.data?.settings, 'secondary_navigation')
        ) {
          throw new Error('Site navigation is unavailable.');
        }
        const routes = freshConfig.data?.config.pageRoutes;
        const result = updatePageNavigation(
          navigation,
          secondaryNavigation,
          posts.map((post) => ({ label: post.title, path: pagePathForSlug(post.slug, routes) })),
          placement,
          siteUrl,
          routes,
        );
        if (result.changed) {
          await editSettings([
            { key: 'navigation', value: JSON.stringify(result.navigation) },
            { key: 'secondary_navigation', value: JSON.stringify(result.secondaryNavigation) },
          ]);
        }
        toast.success(
          placement
            ? `${posts.length === 1 ? 'Page' : `${posts.length} pages`} added to ${placement} navigation`
            : `${posts.length === 1 ? 'Page' : `${posts.length} pages`} removed from navigation`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not update site navigation.');
      } finally {
        busy.current = false;
        setIsRunning(false);
      }
    },
    [available, refreshSettings, refreshConfig, editSettings, siteUrl],
  );
  return useMemo(
    () => ({ available, isRunning, placementFor, update }),
    [available, isRunning, placementFor, update],
  );
}
