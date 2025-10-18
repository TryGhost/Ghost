import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '@/components/ui/button';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {Header} from './header';
import {PageMenu, PageMenuItem} from '@/components/ui/pagemenu';

const meta = {
    title: 'Layout / Page Header',
    component: Header,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof Header>;

export const WithTitleAndActionsAndMenu: Story = {
    args: {
        children: (
            <>
                <Header.Above>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                <BreadcrumbSeparator />
                                <BreadcrumbPage>Content Management</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>

                    </Breadcrumb>
                </Header.Above>
                <Header.Title>Content Management</Header.Title>
                <Header.Meta>Manage your content</Header.Meta>
                <Header.Actions>
                    <Header.ActionGroup>
                        <Button variant="outline">Import</Button>
                        <Button variant="outline">Export</Button>
                        <Button variant="destructive">Delete</Button>
                        <Button>Create New</Button>
                    </Header.ActionGroup>
                </Header.Actions>
                <Header.Nav>
                    <PageMenu defaultValue="content">
                        <PageMenuItem value="content">Content</PageMenuItem>
                        <PageMenuItem value="design">Design</PageMenuItem>
                        <PageMenuItem value="settings">Settings</PageMenuItem>
                        <PageMenuItem value="analytics">Analytics</PageMenuItem>
                    </PageMenu>
                </Header.Nav>
            </>
        )
    }
};

export const WithTitleAndActions: Story = {
    args: {
        children: (
            <>
                <Header.Title>Page Title with Actions</Header.Title>
                <Header.Actions>
                    <Header.ActionGroup>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save</Button>
                    </Header.ActionGroup>
                </Header.Actions>
            </>
        )
    }
};

export const WithBreadcrumb: Story = {
    args: {
        children: (
            <>
                <Header.Above>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Home</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/settings">
                                Settings
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>General</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </Header.Above>

                <Header.Title>General Settings</Header.Title>

                <Header.Actions>
                    <Header.ActionGroup>
                        <Button variant="outline">Reset</Button>
                        <Button>Save Changes</Button>
                    </Header.ActionGroup>
                </Header.Actions>
            </>
        )
    }
};

export const LongTitle: Story = {
    args: {
        children: (
            <>
                <Header.Title>
                    This is a very long page title that might wrap to multiple
                    lines depending on the viewport size
                </Header.Title>
                <Header.Actions>
                    <Header.ActionGroup>
                        <Button>Action</Button>
                    </Header.ActionGroup>
                </Header.Actions>
            </>
        )
    }
};

export const TitleOnly: Story = {
    args: {
        children: <Header.Title>Simple Page Title</Header.Title>
    }
};

export const MultipleActionGroups: Story = {
    args: {
        children: (
            <>
                <Header.Title>Project Dashboard</Header.Title>
                <Header.Actions>
                    <Header.ActionGroup>
                        <Button variant="outline">Refresh</Button>
                        <Button variant="outline">Filter</Button>
                        <Button variant="outline">Import</Button>
                        <Button variant="outline">Export</Button>
                    </Header.ActionGroup>
                    <Header.ActionGroup>
                        <Button variant="destructive">Archive</Button>
                        <Button>Create</Button>
                    </Header.ActionGroup>
                </Header.Actions>
            </>
        )
    }
};
