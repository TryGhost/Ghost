import React from 'react';
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useBrowseConfig } from '@tryghost/admin-x-framework/api/config';
import { isContributorUser, isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import { useFeaturebase } from '@tryghost/admin-x-framework';
import { NavMenuItem } from './nav-menu-item';

/** The Ghost(Pro) billing item shows for the owner of a hosted site. */
function useShowGhostPro(): boolean {
  const { data: currentUser } = useCurrentUser();
  const { data: config } = useBrowseConfig();
  const isProSite = config?.config.hostSettings?.billing?.enabled;

  return Boolean(currentUser && isProSite && isOwnerUser(currentUser));
}

function GhostProMenuItem() {
  return (
    <NavMenuItem>
      <NavMenuItem.Link to="pro">
        <LucideIcon.CreditCard />
        <NavMenuItem.Label>Ghost(Pro)</NavMenuItem.Label>
      </NavMenuItem.Link>
    </NavMenuItem>
  );
}

/** The Ghost(Pro) item on its own, for a menu listing it with other items. */
export function NavGhostProItem() {
  return useShowGhostPro() ? <GhostProMenuItem /> : null;
}

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  const showGhostPro = useShowGhostPro();
  const {
    isAvailable: featurebaseAvailable,
    openFeedbackWidget,
    preloadFeedbackWidget,
  } = useFeaturebase();

  if (!currentUser) {
    return null;
  }

  const showFeedback = featurebaseAvailable && !isContributorUser(currentUser);

  if (!showGhostPro && !showFeedback) {
    return null;
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {showGhostPro && <GhostProMenuItem />}
          {showFeedback && (
            <NavMenuItem>
              <NavMenuItem.Button
                onClick={openFeedbackWidget}
                onFocus={preloadFeedbackWidget}
                onMouseEnter={preloadFeedbackWidget}
              >
                <LucideIcon.MessageCircle />
                <NavMenuItem.Label>Feedback</NavMenuItem.Label>
              </NavMenuItem.Button>
            </NavMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavGhostPro;
