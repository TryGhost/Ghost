import React from 'react';

import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { canAccessSettings, hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { NavMenuItem } from './nav-menu-item';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

function NavSettings({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  const showSettings = currentUser && canAccessSettings(currentUser);
  // Apps sit with Settings rather than the content lists. The shell already
  // reports a failed config load; don't toast it again here.
  const appsEnabled = useFeatureFlag('apps', { defaultErrorHandler: false });
  const showApps = currentUser && hasAdminAccess(currentUser) && appsEnabled;

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {showApps && (
            <NavMenuItem>
              <NavMenuItem.Link to="apps" activeOnSubpath>
                <LucideIcon.LayoutGrid />
                <NavMenuItem.Label>Apps</NavMenuItem.Label>
              </NavMenuItem.Link>
            </NavMenuItem>
          )}
          {showSettings && (
            <NavMenuItem>
              <NavMenuItem.Link to="settings">
                <LucideIcon.Settings />
                <NavMenuItem.Label>Settings</NavMenuItem.Label>
              </NavMenuItem.Link>
            </NavMenuItem>
          )}

          <NavMenuItem>
            <NavMenuItem.Link
              rel="noopener noreferrer"
              target="_blank"
              to="https://ghost.org/help?utm_source=admin&utm_campaign=help"
            >
              <LucideIcon.HelpCircle />
              <NavMenuItem.Label>Help</NavMenuItem.Label>
            </NavMenuItem.Link>
          </NavMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavSettings;
