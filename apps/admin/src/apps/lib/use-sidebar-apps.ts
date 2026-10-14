import { useLocation } from '@tryghost/admin-x-framework';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { canSeeApps } from '@/apps/permissions';
import { appOpenRoute } from './routes';
import { useInstalledApps } from './use-app-pins';

export interface SidebarApp {
  installation: AppInstallation;
  /** Where the app opens: its page, or its review while it's suspended. */
  to: string;
  isActive: boolean;
  isPinned: boolean;
}

export interface SidebarApps {
  /** False while there's nothing to show, or it hasn't loaded. */
  visible: boolean;
  /** On the Apps page itself, where the eyebrow is the current page. */
  onAppsPage: boolean;
  apps: SidebarApp[];
  canPinMore: boolean;
  setPinned: (installationId: string, pinned: boolean) => void;
}

/**
 * The installation that's open: the app itself, at any of its pages, its
 * details, or the review of its changes.
 */
function openInstallationId(
  pathname: string,
  search: string,
  installations: AppInstallation[],
): string | undefined {
  if (/^\/apps\/install\/?$/.test(pathname)) {
    const manifestUrl = new URLSearchParams(search).get('manifest');
    return installations.find((installation) => installation.manifest_url === manifestUrl)?.id;
  }
  const details = /^\/apps\/details\/([^/]+)\/?$/.exec(pathname);
  if (details) {
    return details[1];
  }
  return /^\/apps\/([^/]+)(?:\/|$)/.exec(pathname)?.[1];
}

/**
 * The apps the sidebar lists under "Apps", for the Owner and Administrators
 * with the `apps` Labs flag on. On the Apps page that's every installed app,
 * pinned ones first; elsewhere only the pinned apps, plus the open app if it
 * isn't pinned. Hidden until something is installed, except on Apps' own pages,
 * so uninstalling the last app doesn't pull the link out from under you.
 */
export function useSidebarApps(): SidebarApps {
  const enabled = useFeatureFlag('apps');
  const { data: currentUser } = useCurrentUser();
  const visibleToUser = canSeeApps(currentUser, enabled);
  // An older Ghost without the endpoint, or any failure, just hides the section.
  const { installations, pins } = useInstalledApps({ enabled: visibleToUser });
  const { pathname, search } = useLocation();

  const inApps = pathname === '/apps' || pathname.startsWith('/apps/');
  const onAppsPage = /^\/apps\/?$/.test(pathname);
  const openId = openInstallationId(pathname, search, installations);

  const byId = new Map(installations.map((installation) => [installation.id, installation]));
  const pinned = pins.pinnedIds.flatMap((id) => byId.get(id) ?? []);
  const unpinned = installations.filter((installation) => !pins.isPinned(installation.id));
  const listed = onAppsPage
    ? [...pinned, ...unpinned]
    : [...pinned, ...unpinned.filter((installation) => installation.id === openId)];

  return {
    visible: visibleToUser && pins.isLoaded && (installations.length > 0 || inApps),
    onAppsPage,
    apps: listed.map((installation) => ({
      installation,
      to: appOpenRoute(installation),
      isActive: installation.id === openId,
      isPinned: pins.isPinned(installation.id),
    })),
    canPinMore: pins.canPinMore,
    setPinned: pins.setPinned,
  };
}
