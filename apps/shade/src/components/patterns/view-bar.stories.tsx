import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '@/components/ui/button';
import {PageMenu, PageMenuItem} from '@/components/ui/pagemenu';
import {ViewBar} from '@/components/patterns/view-bar';
import {CalendarDays, Gauge, Mail, Sprout} from 'lucide-react';

const meta = {
    title: 'Patterns / View Bar',
    component: ViewBar,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof ViewBar>;

export default meta;
type Story = StoryObj<typeof ViewBar>;

export const WithActions: Story = {
    name: 'With actions',
    render: () => (
        <ViewBar>
            <ViewBar.Nav>
                <PageMenu defaultValue="overview" responsive>
                    <PageMenuItem value="overview">
                        <Gauge />
                        Overview
                    </PageMenuItem>
                    <PageMenuItem value="newsletter">
                        <Mail />
                        Newsletter
                    </PageMenuItem>
                    <PageMenuItem value="growth">
                        <Sprout />
                        Growth
                    </PageMenuItem>
                </PageMenu>
            </ViewBar.Nav>
            <ViewBar.Actions>
                <Button variant="outline">
                    <CalendarDays className="size-4" />
                    Last 30 days
                </Button>
            </ViewBar.Actions>
        </ViewBar>
    )
};

export const NavOnly: Story = {
    name: 'Nav only',
    render: () => (
        <ViewBar>
            <ViewBar.Nav>
                <PageMenu defaultValue="overview" responsive>
                    <PageMenuItem value="overview">
                        <Gauge />
                        Overview
                    </PageMenuItem>
                    <PageMenuItem value="newsletter">
                        <Mail />
                        Newsletter
                    </PageMenuItem>
                    <PageMenuItem value="growth">
                        <Sprout />
                        Growth
                    </PageMenuItem>
                </PageMenu>
            </ViewBar.Nav>
        </ViewBar>
    )
};
