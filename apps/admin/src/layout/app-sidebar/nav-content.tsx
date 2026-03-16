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
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { canManageMembers, canManageTags } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./nav-menu-item";
import NavSubMenu from "./nav-sub-menu";
import { useMemberCount } from "./hooks/use-member-count";
import { useNavigationExpanded } from "./hooks/use-navigation-preferences";
import { NavCustomViews } from "./nav-custom-views";
import { useEmberRouting } from "@/ember-bridge";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const [postsExpanded, setPostsExpanded] = useNavigationExpanded('posts');
    const memberCount = useMemberCount();
    const routing = useEmberRouting();
    const commentModerationEnabled = useFeatureFlag('commentModeration');
    const membersForwardEnabled = useFeatureFlag('membersForward');

    const showTags = currentUser && canManageTags(currentUser);
    const showMembers = currentUser && canManageMembers(currentUser);

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
                            className="hover:text-gray-black absolute top-0 left-3 h-9 h-[34px]! w-auto p-0 text-sidebar-accent-foreground transition-all group-hover/menu-item:opacity-100 hover:bg-transparent focus-visible:opacity-100 sidebar:opacity-0"
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
                            <LucideIcon.PenLine className="pointer-events-none opacity-0 transition-all sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0" />
                            <NavMenuItem.Label>Posts</NavMenuItem.Label>
                        </NavMenuItem.Link>
                        <a href="#/editor/post"
                            aria-label="Create new post"
                            className="absolute top-0 right-0 flex size-8 items-center justify-center rounded-full p-0 text-gray-700 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                            <LucideIcon.Plus
                                size={20}
                                className="mt-px stroke-[1.5px]!"
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
                        <NavMenuItem>
                            <NavMenuItem.Link
                                to={membersForwardEnabled ? 'members-forward' : routing.getRouteUrl('members')}
                                isActive={routing.isRouteActive(['members', 'member', 'member.new'])}
                            >
                                <LucideIcon.Users />
                                <NavMenuItem.Label>Members</NavMenuItem.Label>
                            </NavMenuItem.Link>
                            {memberCount != null && (
                                <SidebarMenuBadge>{(formatNumber as (value: number) => string)(memberCount)}</SidebarMenuBadge>
                            )}
                        </NavMenuItem>
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
