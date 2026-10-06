import React from 'react';

import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { canAccessSettings } from '@tryghost/admin-x-framework/api/users';
import { GhostProNavItem } from './nav-ghost-pro';
import { useShowGhostPro } from './hooks/use-show-ghost-pro';
import { NavMenuItem } from './nav-menu-item';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

function NavSettings({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  const showSettings = currentUser && canAccessSettings(currentUser);
  // With Apps on, Ghost(Pro) moves here from its own group (see NavGhostPro).
  const appsEnabled = useFeatureFlag('apps');
  const showGhostPro = useShowGhostPro() && appsEnabled;

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {showGhostPro && <GhostProNavItem />}
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
