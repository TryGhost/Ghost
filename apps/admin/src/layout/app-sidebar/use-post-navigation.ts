import { buildPostViewUrl, getDefaultPostViews, isPostViewActive } from './post-sidebar-views';
import { getStickyPostFilterUrl, type PostResource } from '@/posts/api';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { type NavSavedView } from './nav-saved-views';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useLocation } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';
import { useSharedViews } from './shared-views';

export interface PostNavigation {
  /** Where the top-level item links to. */
  mainUrl: string;
  /** Highlighted only when no view is active. */
  isMainActive: boolean;
  defaultViews: NavSavedView[];
  customViews: NavSavedView[];
}

export function usePostNavigation(route: PostResource = 'posts'): PostNavigation {
  const location = useLocation();
  const sharedViews = useSharedViews(route);
  const { data: currentUser } = useCurrentUser();
  const isContributor = Boolean(currentUser && isContributorUser(currentUser));

  return useMemo(() => {
    const toNavView = (
      name: string,
      filter: Record<string, string | null>,
      color?: string,
    ): NavSavedView => ({
      // Name included: a saved view whose filter equals a default
      // view's would otherwise collide with it.
      key: `${name}:${buildPostViewUrl(route, filter)}`,
      name,
      to: buildPostViewUrl(route, filter),
      isActive: isPostViewActive(location, route, filter),
      color,
    });

    // Posts only: views can't be saved from the pages screen, and a view
    // nobody can see must not suppress the Pages highlight.
    const viewFilters =
      route === 'posts'
        ? [
            ...getDefaultPostViews(isContributor).map((view) => view.filter),
            ...sharedViews.map((view) => view.filter),
          ]
        : [];

    const defaultViews =
      route === 'posts'
        ? getDefaultPostViews(isContributor).map((view) => toNavView(view.name, view.filter))
        : [];

    const customViews =
      route === 'posts'
        ? sharedViews.map((view) => toNavView(view.name, view.filter, view.color))
        : [];

    const allViews = [...defaultViews, ...customViews];

    return {
      // Posts opens the full list, matching Members. Editor breadcrumbs
      // separately preserve the last list's filters.
      mainUrl:
        route === 'posts' ? route : getStickyPostFilterUrl(route, location.pathname, viewFilters),
      // The parent highlights only when no view underneath is.
      isMainActive: location.pathname === `/${route}` && !allViews.some((view) => view.isActive),
      defaultViews,
      customViews,
    };
  }, [location, route, sharedViews, isContributor]);
}
