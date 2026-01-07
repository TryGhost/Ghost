import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarProvider,
    SidebarTrigger
} from './sidebar';
import {
    Home,
    Inbox,
    Calendar,
    Search,
    Settings,
    User,
    ChevronUp,
    Plus,
    MoreHorizontal,
    Folder,
    FileText,
    Users,
    CreditCard
} from 'lucide-react';

const meta = {
    title: 'Components / Sidebar',
    component: SidebarProvider,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'Collapsible sidebar navigation component with support for nested menus, actions, and responsive behavior. Built with context for state management.'
            }
        }
    }
} satisfies Meta<typeof SidebarProvider>;

export default meta;
type Story = StoryObj<typeof SidebarProvider>;

const AppSidebarContent = () => {
    return (
        <>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Home className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Acme Inc</span>
                                    <span className="truncate text-xs">Enterprise</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Home">
                                <Home />
                                <span>Home</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Inbox">
                                <Inbox />
                                <span>Inbox</span>
                                <SidebarMenuBadge>24</SidebarMenuBadge>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Calendar">
                                <Calendar />
                                <span>Calendar</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Search">
                                <Search />
                                <span>Search</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Settings">
                                <Settings />
                                <span>Settings</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Projects</SidebarGroupLabel>
                    <SidebarGroupAction>
                        <Plus />
                        <span className="sr-only">Add Project</span>
                    </SidebarGroupAction>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton>
                                <Folder />
                                <span>Design System</span>
                            </SidebarMenuButton>
                            <SidebarMenuAction showOnHover>
                                <MoreHorizontal />
                                <span className="sr-only">More</span>
                            </SidebarMenuAction>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton>
                                <FileText />
                                <span>Documentation</span>
                            </SidebarMenuButton>
                            <SidebarMenuAction showOnHover>
                                <MoreHorizontal />
                                <span className="sr-only">More</span>
                            </SidebarMenuAction>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
                <SidebarGroup className="group-data-[collapsible=icon]:hidden">
                    <SidebarGroupLabel>Help</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="sm">
                                <span>Support</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="sm">
                                <span>Feedback</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <User />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">john@acme.com</span>
                                    <span className="truncate text-xs">Account</span>
                                </div>
                                <ChevronUp className="ml-auto size-4" />
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </>
    );
};

const SampleMainContent = () => {
    return (
        <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="aspect-video rounded-xl bg-muted/50" />
                    <div className="aspect-video rounded-xl bg-muted/50" />
                    <div className="aspect-video rounded-xl bg-muted/50" />
                </div>
                <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
            </div>
        </SidebarInset>
    );
};

export const Default: Story = {
    render: () => (
        <SidebarProvider>
            <Sidebar>
                <AppSidebarContent />
            </Sidebar>
            <SampleMainContent />
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Full sidebar layout with header, navigation groups, and footer. Includes collapsible behavior and tooltips.'
            }
        }
    }
};

export const FloatingVariant: Story = {
    render: () => (
        <SidebarProvider>
            <Sidebar variant="floating">
                <AppSidebarContent />
            </Sidebar>
            <SampleMainContent />
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Floating sidebar variant with rounded corners and shadow.'
            }
        }
    }
};

export const InsetVariant: Story = {
    render: () => (
        <SidebarProvider>
            <Sidebar variant="inset">
                <AppSidebarContent />
            </Sidebar>
            <SampleMainContent />
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Inset sidebar variant with margin and rounded main content area.'
            }
        }
    }
};

export const RightSide: Story = {
    render: () => (
        <SidebarProvider>
            <SampleMainContent />
            <Sidebar side="right">
                <AppSidebarContent />
            </Sidebar>
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Sidebar positioned on the right side of the layout.'
            }
        }
    }
};

export const NonCollapsible: Story = {
    render: () => (
        <SidebarProvider>
            <Sidebar collapsible="none">
                <AppSidebarContent />
            </Sidebar>
            <SampleMainContent />
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Sidebar that cannot be collapsed - always remains expanded.'
            }
        }
    }
};

const MinimalSidebarContent = () => {
    return (
        <>
            <SidebarHeader>
                <SidebarInput placeholder="Search..." />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Dashboard" isActive>
                                <Home />
                                <span>Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Users">
                                <Users />
                                <span>Users</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Billing">
                                <CreditCard />
                                <span>Billing</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
        </>
    );
};

export const Minimal: Story = {
    render: () => (
        <SidebarProvider>
            <Sidebar>
                <MinimalSidebarContent />
            </Sidebar>
            <SampleMainContent />
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Minimal sidebar with just search and basic navigation items.'
            }
        }
    }
};

export const WithSkeletonLoading: Story = {
    render: () => (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <SidebarMenuSkeleton showIcon />
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Loading...</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuSkeleton showIcon />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuSkeleton showIcon />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuSkeleton />
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuSkeleton showIcon />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
            <SampleMainContent />
        </SidebarProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Sidebar with skeleton loading states for menu items.'
            }
        }
    }
};
