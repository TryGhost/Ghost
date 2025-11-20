import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuBadge
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { canManageMembers, canManageTags } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./NavMenuItem";
import { Submenu } from "./Submenu";
import { useMemberCount } from "./hooks/useMemberCount";
import { NavCustomViews } from "./NavCustomViews";

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const memberCount = useMemberCount();

    const showTags = currentUser && canManageTags(currentUser);
    const showMembers = currentUser && canManageMembers(currentUser);

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <Submenu
                        label="Posts"
                        to="posts"
                        icon={<LucideIcon.PenLine />}
                        storageKey="posts"
                        action={
                            <a 
                                href="#/editor/post"
                                aria-label="Create new post"
                                className="flex items-center justify-center absolute hover:bg-sidebar-accent transition-all rounded-full right-0 top-0 p-0 size-8 text-gray-700 hover:text-sidebar-accent-foreground"
                            >
                                <LucideIcon.Plus
                                    size={20}
                                    className="!stroke-[1.5px] mt-px"
                                />
                            </a>
                        }
                    >
                        <Submenu.Item to="posts?type=draft">
                            <NavMenuItem.Label>Drafts</NavMenuItem.Label>
                        </Submenu.Item>

                        <Submenu.Item to="posts?type=scheduled">
                            <NavMenuItem.Label>Scheduled</NavMenuItem.Label>
                        </Submenu.Item>

                        <Submenu.Item to="posts?type=published">
                            <NavMenuItem.Label>Published</NavMenuItem.Label>
                        </Submenu.Item>

                        <NavCustomViews />
                    </Submenu>

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
