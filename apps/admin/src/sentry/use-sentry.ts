import { useEffect, useLayoutEffect, useRef } from 'react';
import { setTag, setUser } from '@sentry/react';
import { useLocation } from '@tryghost/admin-x-framework';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useRoutePattern } from '@/routes';
import {
  AUTOMATIONS_REPLAY_SAMPLE_RATE,
  createAutomationsReplay,
  type AutomationsReplay,
} from './automations-replay';
import { getReplay, initSentry, setSentryFullVersion } from './init-sentry';

/** Reports Admin errors to Sentry when the server supplies a DSN on `/site/`. */
export function useSentry(): void {
  const { data: siteData } = useBrowseSite({ defaultErrorHandler: false });
  const { data: currentUser } = useCurrentUser();
  const { data: configData } = useBrowseConfig({ enabled: Boolean(currentUser) });
  const { pathname } = useLocation();
  const routePattern = useRoutePattern();

  const dsn = siteData?.site.sentry_dsn;
  const environment = siteData?.site.sentry_env;
  const siteVersion = siteData?.site.version;
  const fullVersion = configData?.config.version;
  const role = currentUser?.roles[0]?.name;

  const pathnameRef = useRef(pathname);
  const automationsReplayRef = useRef<AutomationsReplay>();

  // Layout effect: masks before rrweb observes the committed route DOM, and runs before
  // the init effect so a replay created in the same commit sees this pathname
  useLayoutEffect(() => {
    pathnameRef.current = pathname;
    automationsReplayRef.current?.update(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!dsn || siteVersion === undefined) {
      return;
    }
    initSentry({ dsn, environment, version: siteVersion });

    const replay = getReplay();
    if (!replay) {
      return;
    }
    const automationsReplay = createAutomationsReplay(
      replay,
      Math.random() < AUTOMATIONS_REPLAY_SAMPLE_RATE,
      pathnameRef.current,
    );
    automationsReplayRef.current = automationsReplay;
    return () => {
      automationsReplay.dispose();
      automationsReplayRef.current = undefined;
    };
  }, [dsn, environment, siteVersion]);

  useEffect(() => {
    setSentryFullVersion(fullVersion);
  }, [fullVersion]);

  useEffect(() => {
    setUser(role ? { role } : null);
  }, [role]);

  useEffect(() => {
    if (routePattern) {
      setTag('route', routePattern);
    }
  }, [routePattern]);
}
