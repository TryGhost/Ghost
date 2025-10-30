import React, { useState } from "react"

import {
    Button,
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuBadge
} from "@tryghost/shade"
import NavLink from "./NavLink"

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const [postsExpanded, setPostsExpanded] = useState(false);

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavLink
                        label="Posts"
                        href="#/posts"
                    >
                        <NavLink.Before>
                            <Button
                                variant='ghost'
                                aria-label="Toggle post views"
                                size='icon'
                                className={`absolute opacity-0 group-hover/menu-item:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-gray-800 hover:text-gray-black hover:bg-transparent`}
                                onClick={() =>
                                    setPostsExpanded(!postsExpanded)
                                }
                            >
                                {postsExpanded ?
                                    <LucideIcon.ChevronDown size={16} />
                                :
                                    <LucideIcon.ChevronRight size={16} />
                                }
                            </Button>
                        </NavLink.Before>
                        <NavLink.Icon><LucideIcon.PenLine className="group-hover/menu-item:opacity-0 pointer-events-none transition-all" /></NavLink.Icon>
                        <NavLink.After>
                            <a href="#/editor/post"
                                aria-label="Create new post"
                                className="flex items-center justify-center absolute hover:bg-gray-200 transition-all rounded-full right-0 top-0 p-0 size-8 text-gray-700 hover:text-black"
                            >
                                <LucideIcon.Plus size={20} className="!stroke-[1.5px] mt-px" />
                            </a>
                        </NavLink.After>
                    </NavLink>

                    {/* Posts submenu */}
                    {postsExpanded && (
                        <div className="mb-5">
                            <NavLink
                                label="Drafts"
                                href="#/posts?type=draft"
                                className="[&_a]:pl-9"
                            />
                            <NavLink
                                label="Scheduled"
                                href="#/posts?type=scheduled"
                                className="[&_a]:pl-9"
                            />
                            <NavLink
                                label="Published"
                                href="#/posts?type=published"
                                className="[&_a]:pl-9"
                            />
                        </div>
                    )}

                    <NavLink
                        label="Pages"
                        href="#/pages"
                    >
                        <NavLink.Icon><LucideIcon.File /></NavLink.Icon>
                    </NavLink>

                    <NavLink
                        label="Tags"
                        href="#/tags"
                    >
                        <NavLink.Icon><LucideIcon.Tag /></NavLink.Icon>
                    </NavLink>

                    <NavLink
                        label="Members"
                        href="#/members"
                    >
                        <NavLink.Icon><LucideIcon.Users /></NavLink.Icon>
                        <NavLink.After>
                            <SidebarMenuBadge>24</SidebarMenuBadge>
                        </NavLink.After>
                    </NavLink>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
