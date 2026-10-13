import React from 'react';

import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { canAccessSettings } from '@tryghost/admin-x-framework/api/users';
import { NavMenuItem } from './nav-menu-item';
import { NavGhostProItem } from './nav-ghost-pro';
import { useSettingsReturnToState } from '@/layout/settings-navigation';

interface NavSettingsProps extends React.ComponentProps<typeof SidebarGroup> {
  /** Admin 7 lists Ghost(Pro) here and moves Help to the account menu. */
  admin7Design?: boolean;
}

function NavSettings({ admin7Design = false, ...props }: NavSettingsProps) {
  const { data: currentUser } = useCurrentUser();
  const showSettings = currentUser && canAccessSettings(currentUser);
  const settingsReturnToState = useSettingsReturnToState();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {admin7Design && <NavGhostProItem />}
          {showSettings && (
            <NavMenuItem>
              <NavMenuItem.Link state={settingsReturnToState} to="settings">
                <LucideIcon.Settings />
                <NavMenuItem.Label>Settings</NavMenuItem.Label>
              </NavMenuItem.Link>
            </NavMenuItem>
          )}

          {!admin7Design && (
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
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavSettings;
