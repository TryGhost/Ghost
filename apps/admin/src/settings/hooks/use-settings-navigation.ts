import { useCallback, useMemo } from 'react';
import { useFramework, useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useScrollSectionContext } from './use-scroll-section';

type ExternalLink = {
  isExternal: true;
  route: string;
  models?: string[] | null;
};

type InternalLink = {
  isExternal?: false;
  route: string;
  replace?: boolean;
};

export type SettingsLink = string | InternalLink | ExternalLink;

export function useSettingsNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { externalNavigate } = useFramework();
  const { scrollToSection } = useScrollSectionContext();

  // The settings-relative path without query, matching the legacy
  // RoutingProvider's `route` string that prefix-checking call sites parse.
  const route = useMemo(() => location.pathname.replace(/^\/settings\/?/, ''), [location.pathname]);

  const updateRoute = useCallback(
    (to: SettingsLink) => {
      if (typeof to === 'object' && to.isExternal) {
        externalNavigate(to);
        return;
      }

      const link = typeof to === 'string' ? { route: to } : to;
      // Legacy links are settings-relative even with a leading slash; the
      // router resolves absolute paths only, so normalize every shape.
      const relative = link.route.replace(/^\//, '');
      const queryIndex = relative.indexOf('?');
      const pathOnly = queryIndex === -1 ? relative : relative.slice(0, queryIndex);
      const query = queryIndex === -1 ? '' : relative.slice(queryIndex + 1);
      const target = pathOnly ? `/settings/${pathOnly}` : '/settings';
      const targetSearch = query ? `?${query}` : '';

      if (!link.replace && location.pathname === target) {
        // Same-path re-navigation re-scrolls the section; with an
        // identical query it must not push a history entry (legacy
        // RoutingProvider contract).
        if (location.search === targetSearch) {
          scrollToSection(pathOnly.split('/')[0]);
          return;
        }
        navigate(target + targetSearch, { replace: link.replace });
        scrollToSection(pathOnly.split('/')[0]);
        return;
      }

      navigate(target + targetSearch, { replace: link.replace });
    },
    [externalNavigate, navigate, location.pathname, location.search, scrollToSection],
  );

  return { route, updateRoute };
}
