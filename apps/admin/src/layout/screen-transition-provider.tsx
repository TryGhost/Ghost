import { type ReactNode, useCallback, useRef } from 'react';
import {
  matchRoutes,
  useMatches,
  ViewTransitionResolverProvider,
} from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { routes, useEmberOwnedRouteMatcher } from '@/routes';
import { shouldRunScreenTransition } from './screen-transition';

/** Runs router navigations across a full-screen surface's boundary as a view transition. */
export function ScreenTransitionProvider({ children }: { children: ReactNode }) {
  const enabled = useFeatureFlag('admin7ScreenTransitions');
  const settingsSidebarEnabled = useFeatureFlag('admin7settings');
  const matches = useMatches();
  const isEmberOwned = useEmberOwnedRouteMatcher();

  // A stable resolver keeps every navigate and link from re-rendering on its account.
  // Updated during render so links rendered below already see the new matches.
  const latest = useRef({ enabled, settingsSidebarEnabled, matches, isEmberOwned });
  latest.current = { enabled, settingsSidebarEnabled, matches, isEmberOwned };

  const resolve = useCallback((pathname: string) => {
    const current = latest.current;
    if (!current.enabled) {
      return false;
    }

    const target = matchRoutes(routes, pathname) ?? [];
    return (
      shouldRunScreenTransition({
        from: current.matches.map((match) => match.handle),
        to: target.map((match): unknown => match.route.handle),
        enabled: current.enabled,
        settingsSidebarEnabled: current.settingsSidebarEnabled,
      }) && !current.isEmberOwned(pathname)
    );
  }, []);

  return (
    <ViewTransitionResolverProvider value={resolve}>{children}</ViewTransitionResolverProvider>
  );
}
