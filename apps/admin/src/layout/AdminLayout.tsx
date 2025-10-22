import React, { useState } from "react";
import {
    Badge,
    LucideIcon,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@tryghost/shade";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@tryghost/shade";
import { Button } from "@tryghost/shade";
import {
    Settings,
    Sun,
    ChevronDown
} from "lucide-react";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [postsExpanded, setPostsExpanded] = useState(false);

    const site = useBrowseSite();
    const title = site.data?.site.title ?? "Loading...";
    const logo = site.data?.site.logo ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";

    const { data: currentUser } = useCurrentUser();

    return (
        <SidebarProvider open={!!currentUser}>
            <Sidebar>

                <SidebarHeader>
                    <div className="px-4 pt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-transparent border-0 flex-shrink-0">
                                <img
                                    src={logo}
                                    alt="Site icon"
                                    className="w-full h-full rounded-md object-cover"
                                />
                            </div>
                            <div className="font-semibold text-[15px] text-black overflow-hidden text-ellipsis whitespace-nowrap">
                                {title}
                            </div>
                        </div>
                        <Button
                            variant='ghost'
                            size='icon'
                            className="size-9 text-gray-700 rounded-full hover:bg-gray-200 -mr-1"
                            title="Search site (Ctrl/⌘ + K)"
                        >
                            <LucideIcon.Search size={20} />
                        </Button>
                    </div>
                </SidebarHeader>


                <SidebarContent className="p-3 gap-4">

                    {/* Main navigation section */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="#/analytics">
                                            <LucideIcon.TrendingUp />
                                            <span>Analytics</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="#/network">
                                            <LucideIcon.Globe />
                                            <span>Network</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem className="relative group/viewsite">
                                    <SidebarMenuButton asChild>
                                        <a href="#/site">
                                            <LucideIcon.AppWindow />
                                            <span>View site</span>
                                        </a>
                                    </SidebarMenuButton>
                                    <a href="https://example.com" className="absolute opacity-0 group-hover/viewsite:opacity-100 right-0 top-0 size-9 hover:bg-gray-200 flex items-center justify-center rounded-full text-gray-700 hover:text-black transition-all">
                                        <LucideIcon.ExternalLink size={16} />
                                    </a>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Manage navigation section */}
                    <SidebarGroup>
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
                                        className="absolute hover:bg-gray-200 text-gray-700 transition-all rounded-full right-0 top-0 p-0 size-9"
                                    >
                                        <LucideIcon.Plus size={24} strokeWidth={0.7} />
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

                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a href="#/billing">
                                            <LucideIcon.CreditCard />
                                            <span>Ghost(Pro)</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t-0 mt-auto">
                    <div className="px-8 py-8 flex items-center justify-between">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="flex items-center gap-2 p-1 pr-2 h-auto justify-start hover:bg-gray-100 rounded-full -m-1 mr-0"
                                >
                                    <div className="w-[34px] h-[34px] bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-medium text-white">
                                            U
                                        </span>
                                    </div>
                                    <ChevronDown
                                        className="h-4 w-4 text-gray-400"
                                        strokeWidth={2}
                                    />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="w-[290px] ml-8"
                            >
                                <div className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-[34px] h-[34px] bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-white">
                                                U
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">
                                                User Name
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                user@example.com
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                    <span>Your profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => {
                                    fetch("/ghost/api/admin/session", {
                                        method: "DELETE",
                                    }).then(() => {
                                        window.location.href = "/ghost";
                                    }).catch((error) => {
                                        console.error(error);
                                    });
                                }}>
                                    <span>Sign out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 hover:bg-gray-100 rounded-full p-0"
                                title="Settings (CTRL/⌘ + ,)"
                                asChild
                            >
                                <a href="#/settings" >
                                    <Settings
                                        className="h-5 w-5 text-gray-600"
                                        strokeWidth={2}
                                    />
                                </a>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 hover:bg-gray-100 rounded-full p-0"
                                title="Toggle theme"
                            >
                                <Sun
                                    className="h-5 w-5 text-gray-600"
                                    strokeWidth={2}
                                />
                            </Button>
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset className="bg-white">
                <main className="flex-1 min-h-screen">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
