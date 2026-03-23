import React from "react"

import {
    Button,
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
import NavSubMenu from "./nav-sub-menu";
import { useMemberCount } from "./hooks/use-member-count";
import { useNavigationExpanded } from "./hooks/use-navigation-preferences";
import { NavCustomViews } from "./nav-custom-views";
import { NavMemberViews } from "./nav-member-views";
import { useMemberSidebarViews } from "./member-sidebar-views";
import { getMembersNavActiveRoutes, isMembersNavActive } from "./nav-content.helpers";
import { useEmberRouting } from "@/ember-bridge";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const [postsExpanded, setPostsExpanded] = useNavigationExpanded('posts');
    const [savedMembersExpanded, setMembersExpanded] = useNavigationExpanded('members');
    const memberViews = useMemberSidebarViews();
    const hasMemberViews = memberViews.length > 0;
    const location = useLocation();
    const memberCount = useMemberCount();
    const routing = useEmberRouting();
    const commentModerationEnabled = useFeatureFlag('commentModeration');
    const membersForwardEnabled = useFeatureFlag('membersForward');

    const showTags = currentUser && canManageTags(currentUser);
    const showMembers = currentUser && canManageMembers(currentUser);
    const isOnMembersForward = location.pathname === '/members-forward';
    const hasActiveMemberView = isOnMembersForward && memberViews.some(view => view.isActive);
    const membersExpanded = savedMembersExpanded || hasActiveMemberView;
    const membersNavActive = isMembersNavActive({
        membersForwardEnabled,
        isOnMembersForward,
        hasActiveMemberView,
        isLegacyMembersRouteActive: routing.isRouteActive(getMembersNavActiveRoutes())
    });

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem>
                        <Button
                            aria-controls="posts-submenu"
                            aria-expanded={postsExpanded}
                            aria-label="Toggle post views"
                            variant="ghost"
                            size="icon"
                            className="h-[34px]! absolute sidebar:opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-sidebar-accent-foreground hover:text-gray-black hover:bg-transparent"
                            onClick={() =>
                                void setPostsExpanded(!postsExpanded)
                            }
                        >
                            <LucideIcon.ChevronRight
                                size={16}
                                className={`transition-all ${postsExpanded && 'rotate-[90deg]'}`}
                            />
                        </Button>
                        <NavMenuItem.Link
                            to={routing.getRouteUrl('posts')}
                            isActive={routing.isRouteActive('posts')}
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
                    </NavMenuItem>

                    {/* Posts submenu */}
                    <NavSubMenu isExpanded={postsExpanded} id="posts-submenu">
                        <NavMenuItem>
                            <NavMenuItem.Link
                                className="pl-9"
                                to="posts?type=draft"
                                isActive={routing.isRouteActive('posts', {type: 'draft'})}
                            >
                                <NavMenuItem.Label>Drafts</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link
                                className="pl-9"
                                to="posts?type=scheduled"
                                isActive={routing.isRouteActive('posts', {type: 'scheduled'})}
                            >
                                <NavMenuItem.Label>Scheduled</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link
                                className="pl-9"
                                to="posts?type=published"
                                isActive={routing.isRouteActive('posts', {type: 'published'})}
                            >
                                <NavMenuItem.Label>Published</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavCustomViews />
                    </NavSubMenu>

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
                            <NavMenuItem>
                                {membersForwardEnabled && hasMemberViews && (
                                    <Button
                                        aria-controls="members-submenu"
                                        aria-expanded={membersExpanded}
                                        aria-label="Toggle member views"
                                        variant="ghost"
                                        size="icon"
                                        className="h-[34px]! absolute sidebar:opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-sidebar-accent-foreground hover:text-gray-black hover:bg-transparent"
                                        onClick={() =>
                                            void setMembersExpanded(!membersExpanded)
                                        }
                                    >
                                        <LucideIcon.ChevronRight
                                            size={16}
                                            className={`transition-all ${membersExpanded && 'rotate-[90deg]'}`}
                                        />
                                    </Button>
                                )}
                                <NavMenuItem.Link
                                    to={membersForwardEnabled ? 'members-forward' : routing.getRouteUrl('members')}
                                    isActive={membersNavActive}
                                >
                                    <LucideIcon.Users className={membersForwardEnabled && hasMemberViews ? "opacity-0 sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 pointer-events-none transition-all" : ""} />
                                    <NavMenuItem.Label>Members</NavMenuItem.Label>
                                </NavMenuItem.Link>
                                {memberCount != null && (
                                    <SidebarMenuBadge>{(formatNumber as (value: number) => string)(memberCount)}</SidebarMenuBadge>
                                )}
                            </NavMenuItem>

                            {membersForwardEnabled && hasMemberViews && (
                                <NavSubMenu id="members-submenu" isExpanded={membersExpanded}>
                                    <NavMemberViews />
                                </NavSubMenu>
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
