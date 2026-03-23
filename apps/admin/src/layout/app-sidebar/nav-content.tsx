import React from "react"

import {
    formatNumber,
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuBadge
} from "@tryghost/shade"
import { useLocation } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { canManageMembers, canManageTags } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./nav-menu-item";
import { useMemberCount } from "./hooks/use-member-count";
import { useNavigationExpanded } from "./hooks/use-navigation-preferences";
import { NavCustomViews, useCustomSidebarViews } from "./nav-custom-views";
import { NavMemberViews } from "./nav-member-views";
import { useMemberSidebarViews } from "./member-sidebar-views";
import { getMembersNavActiveRoutes, isMembersNavActive } from "./nav-content.helpers";
import { useEmberRouting } from "@/ember-bridge";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

function PostsNavItemContent({isActive, to}: {isActive: boolean; to: string}) {
    return (
        <>
            <NavMenuItem.Link
                to={to}
                isActive={isActive}
            >
                <LucideIcon.PenLine className="opacity-0 sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 pointer-events-none transition-all" />
                <NavMenuItem.Label>Posts</NavMenuItem.Label>
            </NavMenuItem.Link>
            <a href="#/editor/post"
                aria-label="Create new post"
                className="flex items-center justify-center absolute hover:bg-sidebar-accent transition-all rounded-full right-0 top-0 p-0 size-8 text-gray-700 hover:text-sidebar-accent-foreground"
            >
                <LucideIcon.Plus
                    size={20}
                    className="stroke-[1.5px]! mt-px"
                />
            </a>
        </>
    );
}

function MembersNavItemContent({
    collapsible,
    count,
    isActive,
    to
}: {
    collapsible: boolean;
    count: number | null | undefined;
    isActive: boolean;
    to: string;
}) {
    return (
        <>
            <NavMenuItem.Link
                to={to}
                isActive={isActive}
            >
                <LucideIcon.Users className={collapsible ? "opacity-0 sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 pointer-events-none transition-all" : ""} />
                <NavMenuItem.Label>Members</NavMenuItem.Label>
            </NavMenuItem.Link>
            {count != null && (
                <SidebarMenuBadge>{(formatNumber as (value: number) => string)(count)}</SidebarMenuBadge>
            )}
        </>
    );
}

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const [savedPostsExpanded, setPostsExpanded] = useNavigationExpanded('posts');
    const [savedMembersExpanded, setMembersExpanded] = useNavigationExpanded('members');
    const postCustomViews = useCustomSidebarViews('posts');
    const memberViews = useMemberSidebarViews();
    const hasMemberViews = memberViews.length > 0;
    const location = useLocation();
    const memberCount = useMemberCount();
    const routing = useEmberRouting();
    const commentModerationEnabled = useFeatureFlag('commentModeration');
    const membersForwardEnabled = useFeatureFlag('membersForward');

    const showTags = currentUser && canManageTags(currentUser);
    const showMembers = currentUser && canManageMembers(currentUser);
    const isDraftPostsRouteActive = routing.isRouteActive('posts', {type: 'draft'});
    const isScheduledPostsRouteActive = routing.isRouteActive('posts', {type: 'scheduled'});
    const isPublishedPostsRouteActive = routing.isRouteActive('posts', {type: 'published'});
    const hasActivePostChild = isDraftPostsRouteActive || isScheduledPostsRouteActive || isPublishedPostsRouteActive || postCustomViews.some(view => view.isActive);
    const postsExpanded = savedPostsExpanded || hasActivePostChild;
    const isOnMembersForward = location.pathname === '/members-forward';
    const hasActiveMemberView = isOnMembersForward && memberViews.some(view => view.isActive);
    const membersExpanded = savedMembersExpanded || hasActiveMemberView;
    const membersNavActive = isMembersNavActive({
        membersForwardEnabled,
        isOnMembersForward,
        hasActiveMemberView,
        isLegacyMembersRouteActive: routing.isRouteActive(getMembersNavActiveRoutes())
    });
    const postsRoute = routing.getRouteUrl('posts');
    const isPostsRouteActive = routing.isRouteActive('posts');
    const membersRoute = membersForwardEnabled ? 'members-forward' : routing.getRouteUrl('members');

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem.Collapsible
                        expanded={postsExpanded}
                        id="posts-submenu"
                        onExpandedChange={setPostsExpanded}
                    >
                        <NavMenuItem.CollapsibleItem ariaLabel="Toggle post views">
                            <PostsNavItemContent
                                isActive={isPostsRouteActive}
                                to={postsRoute}
                            />
                        </NavMenuItem.CollapsibleItem>

                        <NavMenuItem.CollapsibleMenu>
                            <NavMenuItem>
                                <NavMenuItem.Link
                                    className="pl-9"
                                    to="posts?type=draft"
                                    isActive={isDraftPostsRouteActive}
                                >
                                    <NavMenuItem.Label>Drafts</NavMenuItem.Label>
                                </NavMenuItem.Link>
                            </NavMenuItem>

                            <NavMenuItem>
                                <NavMenuItem.Link
                                    className="pl-9"
                                    to="posts?type=scheduled"
                                    isActive={isScheduledPostsRouteActive}
                                >
                                    <NavMenuItem.Label>Scheduled</NavMenuItem.Label>
                                </NavMenuItem.Link>
                            </NavMenuItem>

                            <NavMenuItem>
                                <NavMenuItem.Link
                                    className="pl-9"
                                    to="posts?type=published"
                                    isActive={isPublishedPostsRouteActive}
                                >
                                    <NavMenuItem.Label>Published</NavMenuItem.Label>
                                </NavMenuItem.Link>
                            </NavMenuItem>

                            <NavCustomViews />
                        </NavMenuItem.CollapsibleMenu>
                    </NavMenuItem.Collapsible>

                    <NavMenuItem>
                        <NavMenuItem.Link
                            to={routing.getRouteUrl('pages')}
                            isActive={routing.isRouteActive('pages')}
                        >
                            <LucideIcon.File />
                            <NavMenuItem.Label>Pages</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>

                    {showTags && (
                        <NavMenuItem>
                            <NavMenuItem.Link
                                to="tags"
                                isActive={routing.isRouteActive(['tags', 'tag', 'tag.new'])}
                            >
                                <LucideIcon.Tag />
                                <NavMenuItem.Label>Tags</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}

                    {showMembers && (
                        <>
                            {membersForwardEnabled && hasMemberViews ? (
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
                                            to={membersRoute}
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
                                        to={membersRoute}
                                    />
                                </NavMenuItem>
                            )}
                        </>
                    )}

                    {showMembers && commentModerationEnabled && (
                        <NavMenuItem>
                            <NavMenuItem.Link
                                to="comments"
                                activeOnSubpath
                            >
                                <LucideIcon.MessagesSquare />
                                <NavMenuItem.Label>Comments</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
