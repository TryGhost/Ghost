import React, { useState } from "react"

import {
    Button,
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuBadge
} from "@tryghost/shade"
import { NavMenuItem } from "./NavMenuItem";
import NavSubMenu from "./NavSubMenu";

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const [postsExpanded, setPostsExpanded] = useState(false);

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
                            className="!h-[34px] absolute opacity-0 group-hover/menu-item:opacity-100 focus-visible:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto text-gray-800 hover:text-gray-black hover:bg-transparent"
                            onClick={() =>
                                setPostsExpanded(!postsExpanded)
                            }
                        >
                            <LucideIcon.ChevronRight
                                size={16}
                                className={`transition-all ${postsExpanded && 'rotate-[90deg]'}`}
                            />
                        </Button>
                        <NavMenuItem.Link href="#/posts">
                            <LucideIcon.PenLine className="group-hover/menu-item:opacity-0 pointer-events-none transition-all" />
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
                            <NavMenuItem.Link className="pl-9" href="#/posts?type=draft">
                                <NavMenuItem.Label>Drafts</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link className="pl-9" href="#/posts?type=scheduled">
                                <NavMenuItem.Label>Scheduled</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link className="pl-9" href="#/posts?type=published">
                                <NavMenuItem.Label>Published</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    </NavSubMenu>

                    <NavMenuItem>
                        <NavMenuItem.Link href="#/pages">
                            <LucideIcon.File />
                            <NavMenuItem.Label>Pages</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>

                    <NavMenuItem>
                        <NavMenuItem.Link href="#/tags">
                            <LucideIcon.Tag />
                            <NavMenuItem.Label>Tags</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>

                    <NavMenuItem>
                        <NavMenuItem.Link href="#/members" activeOnSubpath>
                            <LucideIcon.Users />
                            <NavMenuItem.Label>Members</NavMenuItem.Label>
                        </NavMenuItem.Link>
                        <SidebarMenuBadge>24</SidebarMenuBadge>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
