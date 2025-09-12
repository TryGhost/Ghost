import React, { useState } from "react";
import {
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
    BarChart3,
    Network,
    Eye,
    ExternalLink,
    FileText,
    File,
    Tag,
    Users,
    CreditCard,
    Settings,
    Sun,
    Search,
    Plus,
    ChevronRight,
    ChevronDown,
} from "lucide-react";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [postsExpanded, setPostsExpanded] = useState(false);

    const site = useBrowseSite();
    const title = site.data?.site.title ?? "Loading...";
    const logo = site.data?.site.logo ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";

    return (
        <SidebarProvider defaultOpen={true} open={true}>
            <Sidebar className="border-none">
                <SidebarHeader>
                    <div className="flex items-center justify-between px-4 pt-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-transparent border-0 flex-shrink-0">
                                <img
                                    src={logo}
                                    alt="Site icon"
                                    className="w-full h-full rounded-md object-cover"
                                />
                            </div>
                            <div className="font-semibold text-[15px] text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                                {title}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-gray-200 rounded-full -mr-2"
                            title="Search site (Ctrl/⌘ + K)"
                        >
                            <Search className="text-gray-500" />
                        </Button>
                    </div>
                </SidebarHeader>

                <SidebarContent className="p-3">
                    {/* Main navigation section */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/analytics"
                                            className="flex items-center w-full"
                                        >
                                            <BarChart3
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            Analytics
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/network"
                                            className="flex items-center w-full"
                                        >
                                            <Network
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            Network
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem className="relative group">
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/site"
                                            className="flex items-center w-full"
                                        >
                                            <Eye
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            View site
                                        </a>
                                    </SidebarMenuButton>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-[-6px] top-0 h-9 w-10 hover:bg-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Open site in new tab"
                                    >
                                        <ExternalLink
                                            className="h-4 w-4 text-gray-500"
                                            strokeWidth={2}
                                        />
                                    </Button>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Manage navigation section */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem className="group">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute left-2 top-2.5 h-4 w-4 hover:bg-transparent p-0 pl-[9px] z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() =>
                                            setPostsExpanded(!postsExpanded)
                                        }
                                        title="Collapse custom post types"
                                    >
                                        <ChevronRight
                                            className={`h-[9px] w-[9px] text-gray-500 transition-transform ${
                                                postsExpanded ? "rotate-90" : ""
                                            }`}
                                            strokeWidth={2}
                                        />
                                    </Button>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/posts"
                                            className="flex items-center w-full"
                                        >
                                            <FileText
                                                className={`h-4 w-4 flex-shrink-0 mr-[11px] transition-opacity ${
                                                    postsExpanded
                                                        ? "opacity-0"
                                                        : "opacity-100 group-hover:opacity-0"
                                                }`}
                                                strokeWidth={1.8}
                                            />
                                            Posts
                                        </a>
                                    </SidebarMenuButton>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-[-6px] top-0 h-9 w-10 hover:bg-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="New post"
                                    >
                                        <Plus
                                            className="h-4 w-4 text-gray-500"
                                            strokeWidth={2}
                                        />
                                    </Button>
                                </SidebarMenuItem>

                                {/* Posts submenu */}
                                {postsExpanded && (
                                    <>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                className="pl-12"
                                            >
                                                <a
                                                    href="#/posts?type=draft"
                                                    className="flex items-center w-full"
                                                >
                                                    Drafts
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                className="pl-12"
                                            >
                                                <a
                                                    href="#/posts?type=scheduled"
                                                    className="flex items-center w-full"
                                                >
                                                    Scheduled
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                className="pl-12"
                                            >
                                                <a
                                                    href="#/posts?type=published"
                                                    className="flex items-center w-full"
                                                >
                                                    Published
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/pages"
                                            className="flex items-center w-full"
                                        >
                                            <File
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            Pages
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/tags"
                                            className="flex items-center w-full"
                                        >
                                            <Tag
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            Tags
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/members"
                                            className="flex items-center w-full"
                                        >
                                            <Users
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            Members
                                            <span className="ml-auto text-xs text-[rgb(98,109,121)] font-normal">
                                                1,000
                                            </span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <a
                                            href="#/billing"
                                            className="flex items-center w-full"
                                        >
                                            <CreditCard
                                                className="h-4 w-4 flex-shrink-0 mr-[11px]"
                                                strokeWidth={1.8}
                                            />
                                            Ghost(Pro)
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
                                <DropdownMenuItem className="cursor-pointer text-red-600">
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
