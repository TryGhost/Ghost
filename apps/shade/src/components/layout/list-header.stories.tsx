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
import {DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';
import {ListHeader} from './list-header';
import {Ellipsis, Filter, Plus, Search} from 'lucide-react';

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
                    <ListHeader.Title>
                        Members
                        <ListHeader.Count>12,345</ListHeader.Count>
                    </ListHeader.Title>
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
                    <ListHeader.Title>
                        Members
                        <ListHeader.Count>12,345</ListHeader.Count>
                    </ListHeader.Title>
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
                    <ListHeader.Title>
                        Members
                        <ListHeader.Count>12,345</ListHeader.Count>
                    </ListHeader.Title>
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

export const MobileResponsive: Story = {
    render: () => (
        <ListHeader>
            <ListHeader.Left>
                <ListHeader.Title>
                    Members
                    <ListHeader.Count>12,345</ListHeader.Count>
                </ListHeader.Title>
            </ListHeader.Left>
            <ListHeader.Actions>
                <ListHeader.ActionGroup mobileMenuBreakpoint={740}>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput
                            placeholder="Search members..."
                            type="search"
                        />
                        <InputGroupAddon>
                            <Search className="size-4" />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button className="justify-center" variant="outline">
                        <Filter className="size-4" />
                        Filter
                    </Button>
                    <ListHeader.ActionGroup.Primary>
                        <Button className="justify-center">
                            <Plus className="size-4" />
                            <span className='hidden sm:inline-block'>Add member</span>
                        </Button>
                    </ListHeader.ActionGroup.Primary>
                    <ListHeader.ActionGroup.MobileMenu>
                        <ListHeader.ActionGroup.MobileMenuTrigger>
                            <Button aria-label="Open members action menu" className="justify-center" size="icon" variant="outline">
                                <Ellipsis className="size-4" />
                            </Button>
                        </ListHeader.ActionGroup.MobileMenuTrigger>
                        <ListHeader.ActionGroup.MobileMenuContent className="w-72">
                            <div className="p-2">
                                <InputGroup className="w-full">
                                    <InputGroupInput
                                        placeholder="Search members..."
                                        type="search"
                                    />
                                    <InputGroupAddon>
                                        <Search className="size-4" />
                                    </InputGroupAddon>
                                </InputGroup>
                            </div>
                            <DropdownMenuItem>
                                <Filter className="size-4" />
                                Filter
                            </DropdownMenuItem>
                        </ListHeader.ActionGroup.MobileMenuContent>
                    </ListHeader.ActionGroup.MobileMenu>
                </ListHeader.ActionGroup>
            </ListHeader.Actions>
        </ListHeader>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Mobile-responsive list header with title-only on the left and a collapsed action group on smaller screens.'
            }
        }
    }
};

export const MobileResponsiveWithBreadcrumbAndDescription: Story = {
    render: () => (
        <ListHeader>
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
                <ListHeader.Title>
                    Members
                    <ListHeader.Count>12,345</ListHeader.Count>
                </ListHeader.Title>
                <ListHeader.Description>Manage your members</ListHeader.Description>
            </ListHeader.Left>
            <ListHeader.Actions>
                <ListHeader.ActionGroup mobileMenuBreakpoint={740}>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput
                            placeholder="Search members..."
                            type="search"
                        />
                        <InputGroupAddon>
                            <Search className="size-4" />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button className="justify-center" variant="outline">
                        <Filter className="size-4" />
                        Filter
                    </Button>
                    <ListHeader.ActionGroup.Primary>
                        <Button className="justify-center">
                            <Plus className="size-4" />
                            <span className='hidden sm:inline-block'>Add member</span>
                        </Button>
                    </ListHeader.ActionGroup.Primary>
                    <ListHeader.ActionGroup.MobileMenu>
                        <ListHeader.ActionGroup.MobileMenuTrigger>
                            <Button aria-label="Open members action menu" className="justify-center" size="icon" variant="outline">
                                <Ellipsis className="size-4" />
                            </Button>
                        </ListHeader.ActionGroup.MobileMenuTrigger>
                        <ListHeader.ActionGroup.MobileMenuContent className="w-72">
                            <div className="p-2">
                                <InputGroup className="w-full">
                                    <InputGroupInput
                                        placeholder="Search members..."
                                        type="search"
                                    />
                                    <InputGroupAddon>
                                        <Search className="size-4" />
                                    </InputGroupAddon>
                                </InputGroup>
                            </div>
                            <DropdownMenuItem>
                                <Filter className="size-4" />
                                Filter
                            </DropdownMenuItem>
                        </ListHeader.ActionGroup.MobileMenuContent>
                    </ListHeader.ActionGroup.MobileMenu>
                </ListHeader.ActionGroup>
            </ListHeader.Actions>
        </ListHeader>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Mobile-responsive list header with breadcrumb, title, description, and a collapsed action group on smaller screens.'
            }
        }
    }
};
