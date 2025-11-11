import React, { useState } from "react"

import {
    Button,
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuBadge
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { canManageMembers, canManageTags } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./NavMenuItem";
import NavSubMenu from "./NavSubMenu";
import { useMemberCount } from "./hooks/useMemberCount";
import { useEditNavigationPreferences, useNavigationPreferences } from "./hooks/use-navigation-preferences";

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const { data: navigationPreferences } = useNavigationPreferences();
    const { mutateAsync: editNavigationPreferences } = useEditNavigationPreferences();
    const memberCount = useMemberCount();

    const showTags = currentUser && canManageTags(currentUser);
    const showMembers = currentUser && canManageMembers(currentUser);

    const postsExpanded = navigationPreferences?.expanded.posts ?? true;

    const togglePostsExpanded = () => {
        void editNavigationPreferences({
            expanded: { posts: !navigationPreferences?.expanded.posts },
        });
    };

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
                            className="!h-[34px] absolute sidebar:opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-gray-800 hover:text-gray-black hover:bg-transparent"
                            onClick={() =>
                                togglePostsExpanded()
                            }
                        >
                            <LucideIcon.ChevronRight
                                size={16}
                                className={`transition-all ${postsExpanded && 'rotate-[90deg]'}`}
                            />
                        </Button>
                        <NavMenuItem.Link to="posts">
                            <LucideIcon.PenLine className="opacity-0 sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 pointer-events-none transition-all" />
                            <NavMenuItem.Label>Posts</NavMenuItem.Label>
                        </NavMenuItem.Link>
                        <a href="#/editor/post"
                            aria-label="Create new post"
                            className="flex items-center justify-center absolute hover:bg-gray-200 transition-all rounded-full right-0 top-0 p-0 size-8 text-gray-700 hover:text-black"
                        >
                            <LucideIcon.Plus
                                size={20}
                                className="!stroke-[1.5px] mt-px"
                            />
                        </a>
                    </NavMenuItem>

                    {/* Posts submenu */}
                    <NavSubMenu isExpanded={postsExpanded} id="posts-submenu">
                        <NavMenuItem>
                            <NavMenuItem.Link className="pl-9" to="posts?type=draft">
                                <NavMenuItem.Label>Drafts</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link className="pl-9" to="posts?type=scheduled">
                                <NavMenuItem.Label>Scheduled</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link className="pl-9" to="posts?type=published">
                                <NavMenuItem.Label>Published</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    </NavSubMenu>

                    <NavMenuItem>
                        <NavMenuItem.Link to="pages">
                            <LucideIcon.File />
                            <NavMenuItem.Label>Pages</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>

                    {showTags && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="tags">
                                <LucideIcon.Tag />
                                <NavMenuItem.Label>Tags</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}

                    {showMembers && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="members" activeOnSubpath>
                                <LucideIcon.Users />
                                <NavMenuItem.Label>Members</NavMenuItem.Label>
                            </NavMenuItem.Link>
                            {memberCount != null && (
                                <SidebarMenuBadge>{memberCount}</SidebarMenuBadge>
                            )}
                        </NavMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
