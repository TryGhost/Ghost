import React from 'react';
import { SidebarGroup, SidebarGroupContent, SidebarMenu } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isContributorUser } from '@tryghost/admin-x-framework/api/users';
import { useFeaturebase } from '@tryghost/admin-x-framework';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { NavMenuItem } from './nav-menu-item';
import { useShowGhostPro } from './hooks/use-show-ghost-pro';

export function GhostProNavItem() {
  return (
    <NavMenuItem>
      <NavMenuItem.Link to="pro">
        <LucideIcon.CreditCard />
        <NavMenuItem.Label>Ghost(Pro)</NavMenuItem.Label>
      </NavMenuItem.Link>
    </NavMenuItem>
  );
}

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  // With Apps on, Ghost(Pro) sits with Settings and Help instead (see NavSettings).
  const appsEnabled = useFeatureFlag('apps');
  const canSeeGhostPro = useShowGhostPro();
  const {
    isAvailable: featurebaseAvailable,
    openFeedbackWidget,
    preloadFeedbackWidget,
  } = useFeaturebase();

  if (!currentUser) {
    return null;
  }

  const showGhostPro = canSeeGhostPro && !appsEnabled;
  const showFeedback = featurebaseAvailable && !isContributorUser(currentUser);

  if (!showGhostPro && !showFeedback) {
    return null;
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {showGhostPro && <GhostProNavItem />}
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
