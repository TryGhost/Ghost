import React from 'react';

import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { canAccessSettings } from '@tryghost/admin-x-framework/api/users';
import { useLocation } from '@tryghost/admin-x-framework';
import { NavMenuItem } from './nav-menu-item';
import { settingsReturnToState } from '@/layout/settings-navigation';

function NavSettings({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  const location = useLocation();
  const showSettings = currentUser && canAccessSettings(currentUser);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {showSettings && (
            <NavMenuItem>
              <NavMenuItem.Link state={settingsReturnToState(returnTo)} to="settings">
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
