import React, { useState } from "react"

import {
    Badge,
    Button,
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import NavLink from "./NavLink"

function NavContent({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const [postsExpanded, setPostsExpanded] = useState(false);

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavLink
                        icon="PenLine"
                        label="Posts"
                        href="#/posts"
                        className="group-hover:[&_a_svg]:opacity-0 [&_a_svg]:pointer-events-none [&_a_svg]:transition-all"
                    >
                        <NavLink.Before>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='absolute opacity-0 group-hover:opacity-100 transition-all left-3 top-0 p-0 h-9 w-auto hover:bg-transparent'
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
                        <NavLink.After>
                            <Button
                                variant='ghost'
                                size='icon'
                                className="absolute hover:bg-gray-200 text-gray-800 transition-all rounded-full right-0 top-0 p-0 size-9 [&_svg]:size-auto"
                            >
                                <LucideIcon.Plus size={24} className="!stroke-[1.2px]" />
                            </Button>
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
                        icon="File"
                        label="Pages"
                        href="#/pages"
                    />

                    <NavLink
                        icon="Tag"
                        label="Tags"
                        href="#/tags"
                    />

                    <NavLink
                        icon="Users"
                        label="Members"
                        href="#/members"
                    >
                        <NavLink.After>
                            <Badge className="absolute right-2 top-2 pointer-events-none" variant='secondary'>1,000</Badge>
                        </NavLink.After>
                    </NavLink>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavContent;
