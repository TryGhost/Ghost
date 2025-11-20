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
import { Submenu, useSubmenuParent, useSubmenuItem } from "./Submenu";
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
                    <Submenu id="posts">
                        {({ isExpanded, setIsExpanded, id }) => (
                            <>
                                <PostsParentItem isExpanded={isExpanded} setIsExpanded={setIsExpanded} id={id} />
                                <Submenu.Items id={id} isExpanded={isExpanded}>
                                    <PostsSubmenuItem to="posts?type=draft" label="Drafts" />
                                    <PostsSubmenuItem to="posts?type=scheduled" label="Scheduled" />
                                    <PostsSubmenuItem to="posts?type=published" label="Published" />
                                    <NavCustomViews />
                                </Submenu.Items>
                            </>
                        )}
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

function PostsParentItem({ isExpanded, setIsExpanded, id }: { isExpanded: boolean; setIsExpanded: (expanded: boolean) => Promise<void>; id: string }) {
    const { isActive } = useSubmenuParent('posts');

    return (
        <NavMenuItem>
            <Submenu.Toggle
                submenuId={id}
                isExpanded={isExpanded}
                onToggle={() => void setIsExpanded(!isExpanded)}
                label="Toggle post views"
            />
            <NavMenuItem.Link to="posts" isActive={isActive}>
                <LucideIcon.PenLine className="opacity-0 sidebar:opacity-100 sidebar:group-hover/menu-item:opacity-0 pointer-events-none transition-all" />
                <NavMenuItem.Label>Posts</NavMenuItem.Label>
            </NavMenuItem.Link>
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
        </NavMenuItem>
    );
}

function PostsSubmenuItem({ to, label }: { to: string; label: string }) {
    const { isActive } = useSubmenuItem(to);

    return (
        <NavMenuItem>
            <NavMenuItem.Link className="pl-9" to={to} isActive={isActive}>
                <NavMenuItem.Label>{label}</NavMenuItem.Label>
            </NavMenuItem.Link>
        </NavMenuItem>
    );
}

export default NavContent;
