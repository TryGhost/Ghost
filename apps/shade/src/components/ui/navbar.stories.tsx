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
    }
};