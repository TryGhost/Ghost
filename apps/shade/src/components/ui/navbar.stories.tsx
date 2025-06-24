import type {Meta, StoryObj} from '@storybook/react';
import {Bell, User} from 'lucide-react';

import {Navbar, NavbarActions} from './navbar';
import {Button} from './button';
import {PageMenu, PageMenuItem} from './pagemenu';

const meta = {
    title: 'Components / Navbar',
    component: Navbar,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof Navbar>;

export const Default: Story = {
    args: {
        className: 'py-8 px-6 border-none',
        children: (
            <>
                <PageMenu responsive>
                    <PageMenuItem value="overview">Overview</PageMenuItem>
                    <PageMenuItem value="customers">Customers</PageMenuItem>
                    <PageMenuItem value="issues">Issues</PageMenuItem>
                    <PageMenuItem value="analytics">Analytics Service</PageMenuItem>
                    <PageMenuItem value="reports">Reports</PageMenuItem>
                    <PageMenuItem value="settings">Settings</PageMenuItem>
                    <PageMenuItem value="integrations">Integrations</PageMenuItem>
                    <PageMenuItem value="billing">Billing & Usage</PageMenuItem>
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
    }
};