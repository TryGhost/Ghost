import React from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from '@tryghost/shade';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@tryghost/shade';
import { Button } from '@tryghost/shade';
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
    ChevronDown,
    Search,
    Plus,
    HelpCircle,
    BookOpen
} from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <SidebarProvider defaultOpen={true} open={true}>
            <Sidebar className="border-r border-gray-200">
                <SidebarHeader className="border-b border-gray-200">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <div className="w-5 h-5 bg-white rounded-full"></div>
                            </div>
                            <div className="font-semibold text-gray-900">Ghost Admin</div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-gray-100"
                            title="Search site (Ctrl/⌘ + K)"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </SidebarHeader>

                <SidebarContent className="px-2">
                    {/* Main Navigation */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/analytics" className="flex items-center gap-3 w-full">
                                            <BarChart3 className="h-4 w-4" />
                                            <span>Analytics</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/network" className="flex items-center gap-3 w-full">
                                            <Network className="h-4 w-4" />
                                            <span>Network</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                
                                <SidebarMenuItem className="relative">
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/site" className="flex items-center gap-3 w-full">
                                            <Eye className="h-4 w-4" />
                                            <span>View site</span>
                                        </a>
                                    </SidebarMenuButton>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute right-2 top-1.5 h-5 w-5 hover:bg-gray-200"
                                        title="Open site in new tab"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Content Management */}
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
                            Content
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem className="relative">
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/posts" className="flex items-center gap-3 w-full">
                                            <FileText className="h-4 w-4" />
                                            <span>Posts</span>
                                        </a>
                                    </SidebarMenuButton>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute right-2 top-1.5 h-5 w-5 hover:bg-gray-200"
                                        title="New post"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </SidebarMenuItem>
                                
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/pages" className="flex items-center gap-3 w-full">
                                            <File className="h-4 w-4" />
                                            <span>Pages</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/tags" className="flex items-center gap-3 w-full">
                                            <Tag className="h-4 w-4" />
                                            <span>Tags</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Members */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/members" className="flex items-center gap-3 w-full">
                                            <Users className="h-4 w-4" />
                                            <span>Members</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Billing */}
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild className="hover:bg-gray-100">
                                        <a href="#/billing" className="flex items-center gap-3 w-full">
                                            <CreditCard className="h-4 w-4" />
                                            <span>Ghost(Pro)</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-gray-200">
                    <div className="p-4 space-y-4">
                        {/* User Dropdown */}
                        <div className="flex items-center justify-between">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="flex items-center gap-3 p-2 h-auto w-full justify-start hover:bg-gray-100">
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-medium text-white">U</span>
                                        </div>
                                        <div className="flex flex-col items-start flex-1 min-w-0">
                                            <span className="text-sm font-medium text-gray-900 truncate">User Name</span>
                                            <span className="text-xs text-gray-500 truncate">user@example.com</span>
                                        </div>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-white">U</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">User Name</span>
                                                <span className="text-xs text-gray-500">user@example.com</span>
                                            </div>
                                        </div>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer">
                                        <span>Your profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer">
                                        <HelpCircle className="h-4 w-4 mr-2" />
                                        <span>Help center</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        <span>Resources & guides</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="cursor-pointer text-red-600">
                                        <span>Sign out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Settings and Theme Toggle */}
                        <div className="flex items-center justify-between">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-gray-100"
                                title="Settings (CTRL/⌘ + ,)"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <div className="relative">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 hover:bg-gray-100"
                                    title="Toggle theme"
                                >
                                    <Sun className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <main className="flex-1 min-h-screen">
                    <div className="p-6">
                        {children}
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
