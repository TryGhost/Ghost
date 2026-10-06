import React from 'react';
import { DynamicIcon } from 'lucide-react/dynamic';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { AdminLink } from '@/shared/admin-link';
import { toIconName } from '@/apps/lib/icons';
import { useRefreshInstalledManifests } from '@/apps/lib/refresh';
import { canManageApps, setAppPinned, useActiveInstallations, usePinnedApps } from '@/apps/api';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useLocation } from '@tryghost/admin-x-framework';
import { NAV_EYEBROW_CLASS, NavMenuItem } from './nav-menu-item';

/**
 * The app's Lucide icon, rendered bare so the nav sizes and colours it exactly
 * like its own icons. An empty slot holds the space while it loads.
 */
function NavAppIcon({ icon }: { icon?: string }) {
  const name = toIconName(icon);

  if (!name) {
    return <LucideIcon.LayoutGrid />;
  }

  return (
    <DynamicIcon
      fallback={() => <span aria-hidden="true" className="size-4 shrink-0" />}
      name={name}
    />
  );
}

interface NavAppItemProps {
  name: string;
  icon?: string;
  to: string;
  isActive: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}

/** An app as a top-level nav item, with a pin button on hover like Posts' "+". */
function NavAppItem({ name, icon, to, isActive, pinned, onTogglePin }: NavAppItemProps) {
  const label = pinned ? `Unpin ${name} from the sidebar` : `Pin ${name} to the sidebar`;

  return (
    <NavMenuItem>
      <NavMenuItem.Link className="pr-8" isActive={isActive} title={name} to={to}>
        <NavAppIcon icon={icon} />
        <NavMenuItem.Label>{name}</NavMenuItem.Label>
      </NavMenuItem.Link>
      <button
        aria-label={label}
        aria-pressed={pinned}
        className="absolute top-0 right-0 flex size-8 items-center justify-center rounded-full text-gray-700 opacity-0 ring-sidebar-ring outline-hidden transition-all group-hover/menu-item:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 dark:text-gray-800 dark:hover:text-white"
        title={label}
        type="button"
        onClick={onTogglePin}
      >
        {pinned ? (
          <LucideIcon.PinOff className="size-4" strokeWidth={1.5} />
        ) : (
          <LucideIcon.Pin className="size-4" strokeWidth={1.5} />
        )}
      </button>
    </NavMenuItem>
  );
}

/**
 * Apps get their own eyebrow, "Apps ›", which links to the Apps page, once
 * there's at least one app installed. On the Apps page, every installed app is
 * listed under it, pinned ones first; elsewhere, including inside an app, only
 * pinned apps stay, plus the open app if it isn't pinned. The open app also
 * lists the pages from its manifest.
 */
function NavApps({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  const appsEnabled = useFeatureFlag('apps');
  const installations = useActiveInstallations();
  const pinnedIds = usePinnedApps();
  const { pathname } = useLocation();
  const canSeeApps = appsEnabled && Boolean(currentUser && canManageApps(currentUser));
  useRefreshInstalledManifests(installations, canSeeApps);

  if (!canSeeApps) {
    return null;
  }

  const [, section, openId, ...rest] = pathname.split('/');
  const inApps = section === 'apps';
  const openApp = inApps
    ? installations.find((installation) => installation.id === openId)
    : undefined;
  const openPath = `/${rest.join('/')}`;
  const onAppsPage = inApps && !openApp;

  // Nothing installed, nothing to group: the eyebrow arrives with the first
  // install (which pins itself). It stays while you're in Apps, so uninstalling
  // the last app doesn't pull the link out from under you.
  if (installations.length === 0 && !inApps) {
    return null;
  }

  const pinned = pinnedIds
    .map((id) => installations.find((installation) => installation.id === id))
    .filter((installation) => installation !== undefined);
  const unpinned = installations.filter((installation) => !pinnedIds.includes(installation.id));
  // An open app that isn't pinned still shows, so the active item has a home.
  const listed = onAppsPage
    ? [...pinned, ...unpinned]
    : [...pinned, ...unpinned.filter((installation) => installation.id === openApp?.id)];

  return (
    <SidebarGroup {...props}>
      <SidebarGroupLabel className={NAV_EYEBROW_CLASS} asChild>
        <AdminLink
          aria-current={onAppsPage ? 'page' : undefined}
          className={cn(
            'w-fit gap-0.5 hover:text-sidebar-foreground',
            onAppsPage && 'text-sidebar-foreground',
          )}
          to="/apps"
        >
          Apps
          <LucideIcon.ChevronRight className="size-3!" strokeWidth={2} />
        </AdminLink>
      </SidebarGroupLabel>
      {listed.length > 0 && (
        <SidebarGroupContent>
          <SidebarMenu>
            {listed.map((installation) => {
              const isOpen = openApp?.id === installation.id;
              const nav = isOpen ? (installation.manifest.nav ?? []) : [];
              const activeNavItem = nav.find(
                (item) => openPath === item.path || openPath.startsWith(`${item.path}/`),
              );
              const isPinned = pinnedIds.includes(installation.id);

              return (
                <React.Fragment key={installation.id}>
                  <NavAppItem
                    icon={installation.manifest.icon}
                    isActive={isOpen && !activeNavItem}
                    name={installation.manifest.name}
                    pinned={isPinned}
                    to={`apps/${installation.id}`}
                    onTogglePin={() => setAppPinned(installation.id, !isPinned)}
                  />
                  {nav.map((item) => (
                    <NavMenuItem.SubmenuItem
                      key={item.path}
                      isActive={item === activeNavItem}
                      title={item.label}
                      to={`apps/${installation.id}${item.path}`}
                    >
                      <NavMenuItem.Label>{item.label}</NavMenuItem.Label>
                    </NavMenuItem.SubmenuItem>
                  ))}
                </React.Fragment>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

export default NavApps;
