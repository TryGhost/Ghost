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
import {ListHeader} from './list-header';

const meta = {
    title: 'Layout / List Header',
    component: ListHeader,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof ListHeader>;

export default meta;
type Story = StoryObj<typeof ListHeader>;

export const Default: Story = {
    args: {
        children: (
            <>
                <ListHeader.Left>
                    <ListHeader.Title>Members 12,345</ListHeader.Title>
                </ListHeader.Left>
                <ListHeader.Actions>
                    <ListHeader.ActionGroup>
                        <Button variant="outline">Import</Button>
                        <Button variant="outline">Export</Button>
                        <Button>Add member</Button>
                    </ListHeader.ActionGroup>
                </ListHeader.Actions>
            </>
        )
    }
};

export const WithDescription: Story = {
    args: {
        children: (
            <>
                <ListHeader.Left>
                    <ListHeader.Title>Members 12,345</ListHeader.Title>
                    <ListHeader.Description>Manage your members</ListHeader.Description>
                </ListHeader.Left>
                <ListHeader.Actions>
                    <ListHeader.ActionGroup>
                        <Button variant="outline">Filter</Button>
                        <Button variant="outline">Import</Button>
                    </ListHeader.ActionGroup>
                </ListHeader.Actions>
            </>
        )
    }
};

export const WithBreadcrumbAndDescription: Story = {
    args: {
        children: (
            <>
                <ListHeader.Left>
                    <ListHeader.Breadcrumb>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbPage>Members</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </ListHeader.Breadcrumb>
                    <ListHeader.Title>Members 12,345</ListHeader.Title>
                    <ListHeader.Description>Manage your members</ListHeader.Description>
                </ListHeader.Left>
                <ListHeader.Actions>
                    <ListHeader.ActionGroup>
                        <Button variant="outline">Import</Button>
                        <Button variant="outline">Export</Button>
                        <Button>Add member</Button>
                    </ListHeader.ActionGroup>
                </ListHeader.Actions>
            </>
        )
    }
};
