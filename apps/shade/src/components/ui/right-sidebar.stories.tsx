import type {Meta, StoryObj} from '@storybook/react-vite';
import {RightSidebarMenu, RightSidebarMenuLink} from './right-sidebar';
import {Settings, User, Bell, HelpCircle, LogOut, Calendar, FileText, Users} from 'lucide-react';

const meta = {
    title: 'Components / RightSidebar',
    component: RightSidebarMenu,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Simple right-aligned sidebar menu component with navigation links and active state support.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px', maxWidth: '300px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof RightSidebarMenu>;

export default meta;
type Story = StoryObj<typeof RightSidebarMenu>;

export const Default: Story = {
    render: () => (
        <RightSidebarMenu>
            <RightSidebarMenuLink active>
                <User />
                Profile
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <Settings />
                Settings
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <Bell />
                Notifications
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <HelpCircle />
                Help & Support
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <LogOut />
                Sign Out
            </RightSidebarMenuLink>
        </RightSidebarMenu>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Basic right sidebar menu with profile and account management links.'
            }
        }
    }
};

export const ProjectNavigation: Story = {
    render: () => (
        <RightSidebarMenu>
            <RightSidebarMenuLink active>
                <Calendar />
                Schedule
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <FileText />
                Documents
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <Users />
                Team Members
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <Settings />
                Project Settings
            </RightSidebarMenuLink>
        </RightSidebarMenu>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Right sidebar configured for project-specific navigation.'
            }
        }
    }
};

export const TextOnly: Story = {
    render: () => (
        <RightSidebarMenu>
            <RightSidebarMenuLink active>
                Overview
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                Analytics
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                Reports
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                Export Data
            </RightSidebarMenuLink>
        </RightSidebarMenu>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Simple text-only navigation without icons.'
            }
        }
    }
};

export const SingleActive: Story = {
    render: () => (
        <RightSidebarMenu>
            <RightSidebarMenuLink>
                <User />
                Profile
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <Settings />
                Settings
            </RightSidebarMenuLink>
            <RightSidebarMenuLink active>
                <Bell />
                Notifications
            </RightSidebarMenuLink>
            <RightSidebarMenuLink>
                <HelpCircle />
                Help
            </RightSidebarMenuLink>
        </RightSidebarMenu>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Menu with middle item active to show active state styling.'
            }
        }
    }
};

export const InLayout: Story = {
    render: () => (
        <div className="flex h-96 rounded-lg border bg-background">
            <div className="flex-1 border-r p-4">
                <h2 className="mb-4 text-lg font-semibold">Main Content</h2>
                <p className="text-muted-foreground">
                    This is the main content area. The right sidebar provides quick access to 
                    account settings and navigation options.
                </p>
            </div>
            <div className="w-64 p-4">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">Quick Actions</h3>
                <RightSidebarMenu>
                    <RightSidebarMenuLink active>
                        <User />
                        Profile
                    </RightSidebarMenuLink>
                    <RightSidebarMenuLink>
                        <Settings />
                        Settings
                    </RightSidebarMenuLink>
                    <RightSidebarMenuLink>
                        <Bell />
                        Notifications
                    </RightSidebarMenuLink>
                    <RightSidebarMenuLink>
                        <HelpCircle />
                        Help
                    </RightSidebarMenuLink>
                </RightSidebarMenu>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Right sidebar menu integrated within a typical layout structure.'
            }
        }
    }
};