import React from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
} from '@tryghost/shade/components';
import { formatNumber, LucideIcon } from '@tryghost/shade/utils';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useMemberCount } from '@tryghost/admin-x-framework/api/members';
import { getSettingValue, useBrowseSettings } from '@tryghost/admin-x-framework/api/settings';
import {
  canManageAutomations,
  canManageMembers,
  canManageTags,
} from '@tryghost/admin-x-framework/api/users';
import { NavGroup } from './nav-group';
import { NavMenuItem } from './nav-menu-item';
import { useNavigationExpanded } from './hooks/use-navigation-preferences';
import { NavSavedViews } from './nav-saved-views';
import { NavMemberViews } from './nav-member-views';
import { useMemberSidebarViews } from './member-sidebar-views';
import { usePostNavigation } from './use-post-navigation';
import { useIsActiveLink } from './use-is-active-link';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useRecordingMode } from '@/automations/api';
import { AdminLink } from '@/shared/admin-link';

function PostsNavItemContent({ isActive, to }: { isActive: boolean; to: string }) {
  return (
    <>
      <NavMenuItem.Link isActive={isActive} to={to}>
        <LucideIcon.PenLine className="pointer-events-none opacity-0 transition-all sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 sidebar:group-has-[button:focus-visible]/menu-item:opacity-0" />
        <NavMenuItem.Label>Posts</NavMenuItem.Label>
      </NavMenuItem.Link>
      <AdminLink
        aria-label="Create new post"
        className="absolute top-0 right-0 flex size-8 items-center justify-center rounded-full p-0 text-gray-700 ring-sidebar-ring outline-hidden transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 dark:text-gray-800 dark:hover:text-white"
        to="/editor/post"
      >
        <LucideIcon.Plus className="mt-px stroke-[1.5px]!" size={20} />
      </AdminLink>
    </>
  );
}

function MembersNavItemContent({
  collapsible,
  count,
  isActive,
  to,
}: {
  collapsible: boolean;
  count: number | null | undefined;
  isActive: boolean;
  to: string;
}) {
  return (
    <>
      <NavMenuItem.Link isActive={isActive} to={to}>
        <LucideIcon.Users
          className={
            collapsible
              ? 'pointer-events-none opacity-0 transition-all sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 sidebar:group-has-[button:focus-visible]/menu-item:opacity-0'
              : ''
          }
        />
        <NavMenuItem.Label>Members</NavMenuItem.Label>
      </NavMenuItem.Link>
      {count !== null && count !== undefined && (
        <SidebarMenuBadge>{formatNumber(count)}</SidebarMenuBadge>
      )}
    </>
  );
}

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
  const { data: currentUser } = useCurrentUser();
  const { data: settingsData } = useBrowseSettings();
  const [savedPostsExpanded, setPostsExpanded] = useNavigationExpanded('posts');
  const [savedMembersExpanded, setMembersExpanded] = useNavigationExpanded('members');
  const postNavigation = usePostNavigation('posts');
  const pageNavigation = usePostNavigation('pages');
  const memberViews = useMemberSidebarViews();
  const hasMemberViews = memberViews.length > 0;
  const memberCount = useMemberCount();
  const automationsEnabled = useFeatureFlag('automations');
  const recordingMode = useRecordingMode();
  const appsEnabled = useFeatureFlag('apps');
  const isMembersRouteActive = useIsActiveLink({ path: 'members', activeOnSubpath: true });
  // Highlight the proto item for any concept under /automations-proto/*, even
  // though the link itself points at the default concept (float).
  const isProtoRouteActive = useIsActiveLink({
    path: 'automations-proto',
    activeOnSubpath: true,
  });
  const isMemberActivityActive = useIsActiveLink({ path: 'members-activity' });

  const showTags = currentUser && canManageTags(currentUser);
  const showMembers = currentUser && canManageMembers(currentUser);
  const showAutomations = currentUser && canManageAutomations(currentUser);
  const commentsEnabled = getSettingValue<string>(settingsData?.settings, 'comments_enabled');
  const showComments = !!showMembers && commentsEnabled !== 'off';
  const postViews = [...postNavigation.defaultViews, ...postNavigation.customViews];
  const hasActivePostChild = postViews.some((view) => view.isActive);
  const postsExpanded = savedPostsExpanded;
  const hasActiveMemberView = hasMemberViews && memberViews.some((view) => view.isActive);
  const membersExpanded = savedMembersExpanded;
  const membersNavActive = isMembersRouteActive
    ? !hasActiveMemberView || !membersExpanded
    : isMemberActivityActive;
  const postsRoute = postNavigation.mainUrl;
  const postsNavActive = postNavigation.isMainActive || (!postsExpanded && hasActivePostChild);
  const hasAudienceItems = Boolean(showMembers) || Boolean(showAutomations && automationsEnabled);

  const contentItems = (
    <>
      <NavMenuItem.Collapsible
        expanded={postsExpanded}
        id="posts-submenu"
        onExpandedChange={setPostsExpanded}
      >
        <NavMenuItem.CollapsibleItem ariaLabel="Toggle post views">
          <PostsNavItemContent isActive={postsNavActive} to={postsRoute} />
        </NavMenuItem.CollapsibleItem>

        <NavMenuItem.CollapsibleMenu>
          <NavSavedViews views={postViews} />
        </NavMenuItem.CollapsibleMenu>
      </NavMenuItem.Collapsible>

      <NavMenuItem>
        <NavMenuItem.Link isActive={pageNavigation.isMainActive} to={pageNavigation.mainUrl}>
          <LucideIcon.File />
          <NavMenuItem.Label>Pages</NavMenuItem.Label>
        </NavMenuItem.Link>
      </NavMenuItem>

      {showTags && (
        <NavMenuItem>
          <NavMenuItem.Link to="tags" activeOnSubpath>
            <LucideIcon.Tag />
            <NavMenuItem.Label>Tags</NavMenuItem.Label>
          </NavMenuItem.Link>
        </NavMenuItem>
      )}
    </>
  );

  const audienceItems = (
    <>
      {showMembers && (
        <>
          {hasMemberViews ? (
            <NavMenuItem.Collapsible
              expanded={membersExpanded}
              id="members-submenu"
              onExpandedChange={setMembersExpanded}
            >
              <NavMenuItem.CollapsibleItem ariaLabel="Toggle member views">
                <MembersNavItemContent
                  collapsible={true}
                  count={memberCount}
                  isActive={membersNavActive}
                  to="members"
                />
              </NavMenuItem.CollapsibleItem>

              <NavMenuItem.CollapsibleMenu>
                <NavMemberViews />
              </NavMenuItem.CollapsibleMenu>
            </NavMenuItem.Collapsible>
          ) : (
            <NavMenuItem>
              <MembersNavItemContent
                collapsible={false}
                count={memberCount}
                isActive={membersNavActive}
                to="members"
              />
            </NavMenuItem>
          )}
        </>
      )}

      {showComments && (
        <NavMenuItem>
          <NavMenuItem.Link to="comments" activeOnSubpath>
            <LucideIcon.MessagesSquare />
            <NavMenuItem.Label>Comments</NavMenuItem.Label>
          </NavMenuItem.Link>
        </NavMenuItem>
      )}

      {/* Recording mode (the prototype's ⌘⇧.) shows the prototype as the
          product for screen recordings: the real item steps aside, and the
          prototype's item below takes its name and icon. */}
      {showAutomations && automationsEnabled && !recordingMode && (
        <NavMenuItem>
          <NavMenuItem.Link to="automations" activeOnSubpath>
            <LucideIcon.Zap />
            <NavMenuItem.Label>Automations</NavMenuItem.Label>
          </NavMenuItem.Link>
        </NavMenuItem>
      )}

      {showAutomations && automationsEnabled && (
        <NavMenuItem>
          <NavMenuItem.Link isActive={isProtoRouteActive} to="automations-proto/phase-1">
            {recordingMode ? <LucideIcon.Zap /> : <LucideIcon.FlaskConical />}
            <NavMenuItem.Label>
              {recordingMode ? 'Automations' : 'Automations (Proto)'}
            </NavMenuItem.Label>
          </NavMenuItem.Link>
        </NavMenuItem>
      )}
    </>
  );

  // With Apps on, eyebrows group the nav: Content and Audience here, Apps below.
  if (appsEnabled) {
    return (
      <>
        <NavGroup {...props}>
          <NavGroup.Label>Content</NavGroup.Label>
          <NavGroup.Menu>{contentItems}</NavGroup.Menu>
        </NavGroup>
        {hasAudienceItems && (
          <NavGroup {...props}>
            <NavGroup.Label>Audience</NavGroup.Label>
            <NavGroup.Menu>{audienceItems}</NavGroup.Menu>
          </NavGroup>
        )}
      </>
    );
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {contentItems}
          {audienceItems}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavContent;
