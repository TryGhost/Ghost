import React, { useState } from "react"

import {
    Badge,
    Button,
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@tryghost/shade"

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const [postsExpanded, setPostsExpanded] = useState(false);

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Button
                            variant='ghost'
                            size='icon'
                            className={`absolute opacity-0 group-hover:opacity-100 transition-all left-3 top-0 p-0 h-9`}
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
                        <SidebarMenuButton asChild className="">
                            <a href="#/posts">
                                <LucideIcon.PenLine size={16} className="transition-all group-hover:opacity-0 pointer-events-none" />
                                <span>Posts</span>
                            </a>
                        </SidebarMenuButton>
                        <Button
                            variant='ghost'
                            size='icon'
                            className="absolute hover:bg-gray-200 text-gray-800 transition-all rounded-full right-0 top-0 p-0 size-9"
                        >
                            <LucideIcon.Plus size={24} className="!stroke-[1.2px]" />
                        </Button>
                    </SidebarMenuItem>

                    {/* Posts submenu */}
                    {postsExpanded && (
                        <div className="mb-5">
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <a href="#/posts?type=draft" className="pl-9">
                                        Drafts
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <a href="#/posts?type=scheduled" className="pl-9">
                                        Scheduled
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <a href="#/posts?type=published" className="pl-9">
                                        Published
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </div>
                    )}

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <a href="#/pages">
                                <LucideIcon.File />
                                <span>Pages</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <a href="#/tags">
                                <LucideIcon.Tag />
                                <span>Tags</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <a href="#/members">
                                <LucideIcon.Users />
                                <span>Members</span>
                            </a>
                        </SidebarMenuButton>
                        <Badge className="absolute right-2 top-2 pointer-events-none" variant='secondary'>1,000</Badge>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
