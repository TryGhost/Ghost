import type {Meta, StoryObj} from '@storybook/react-vite';
import {Bell, User, Settings, Download} from 'lucide-react';

import {Navbar, NavbarActions, NavbarNavigation} from './navbar';
import {Button} from './button';
import {PageMenu, PageMenuItem} from './pagemenu';

const meta = {
    title: 'Components / Navbar',
    component: Navbar,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'Navigation bar component for page-level navigation. Provides flexible layout with menu items and actions. Uses CSS Grid with named areas for responsive layout that adapts from mobile (stacked) to desktop (side-by-side).'
            }
        }
    }
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof Navbar>;

export const Default: Story = {
    args: {
        className: 'py-8 px-6 border-none',
        children: (
            <>
                <PageMenu defaultValue='overview' responsive>
                    <PageMenuItem value="overview">Overview</PageMenuItem>
                    <PageMenuItem value="web">Web traffic</PageMenuItem>
                    <PageMenuItem value="newsletters">Newsletters</PageMenuItem>
                    <PageMenuItem value="growth">Growth</PageMenuItem>
                    <PageMenuItem value="locations">Locations</PageMenuItem>
                </PageMenu>
                <NavbarActions>
                    <Button variant='outline'>
                        <Bell /> Notifications
                    </Button>
                    <Button variant='outline'>
                        <User /> Log in
                    </Button>
                </NavbarActions>
            </>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Complete navbar with navigation menu and action buttons for a typical page header.'
            }
        }
    }
};

export const WithNavbarNavigation: Story = {
    args: {
        className: 'py-8 px-6 border-none',
        children: (
            <>
                <NavbarNavigation>
                    <PageMenu defaultValue='dashboard' responsive>
                        <PageMenuItem value="dashboard">Dashboard</PageMenuItem>
                        <PageMenuItem value="analytics">Analytics</PageMenuItem>
                        <PageMenuItem value="reports">Reports</PageMenuItem>
                    </PageMenu>
                </NavbarNavigation>
                <NavbarActions>
                    <Button variant='outline' size='sm'>
                        <Download /> Export
                    </Button>
                    <Button variant='outline' size='sm'>
                        <Settings /> Settings
                    </Button>
                </NavbarActions>
            </>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Navbar using the explicit NavbarNavigation wrapper for navigation content. Both navigation and actions are properly positioned using grid areas.'
            }
        }
    }
};

export const NavigationOnly: Story = {
    args: {
        className: 'py-8 px-6 border-none',
        children: (
            <NavbarNavigation>
                <PageMenu defaultValue='posts' responsive>
                    <PageMenuItem value="posts">Posts</PageMenuItem>
                    <PageMenuItem value="pages">Pages</PageMenuItem>
                    <PageMenuItem value="tags">Tags</PageMenuItem>
                    <PageMenuItem value="authors">Authors</PageMenuItem>
                </PageMenu>
            </NavbarNavigation>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Navbar with only navigation items, no action buttons.'
            }
        }
    }
};

export const ActionsOnly: Story = {
    args: {
        className: 'py-8 px-6 border-none',
        children: (
            <NavbarActions>
                <Button variant='default'>
                    Create New
                </Button>
                <Button variant='outline'>
                    <Download /> Export
                </Button>
                <Button variant='outline'>
                    <Settings /> Settings
                </Button>
            </NavbarActions>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Navbar with only action buttons, no navigation menu.'
            }
        }
    }
};

export const Minimal: Story = {
    args: {
        className: 'py-4 px-6',
        children: (
            <>
                <NavbarNavigation>
                    <h2 className="text-lg font-semibold">Page Title</h2>
                </NavbarNavigation>
                <NavbarActions>
                    <Button variant='outline' size='sm'>
                        <User /> Account
                    </Button>
                </NavbarActions>
            </>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Minimal navbar with custom navigation content (page title) and a single action button.'
            }
        }
    }
};

export const WithoutBorder: Story = {
    args: {
        className: 'py-8 px-6 border-none',
        children: (
            <>
                <PageMenu defaultValue='home' responsive>
                    <PageMenuItem value="home">Home</PageMenuItem>
                    <PageMenuItem value="about">About</PageMenuItem>
                    <PageMenuItem value="contact">Contact</PageMenuItem>
                </PageMenu>
                <NavbarActions>
                    <Button variant='ghost' size='sm'>
                        Sign in
                    </Button>
                    <Button variant='default' size='sm'>
                        Get started
                    </Button>
                </NavbarActions>
            </>
        )
    },
    parameters: {
        docs: {
            description: {
                story: 'Navbar without the bottom border by using border-none className.'
            }
        }
    }
};
