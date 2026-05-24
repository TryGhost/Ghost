import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {Button} from '@/components/ui/button';
import {DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';
import {PageHeader} from '@/components/patterns/page-header';
import {Ellipsis, Filter as FilterIcon, Plus, Search} from 'lucide-react';

const meta = {
    title: 'Patterns / Page Header',
    component: PageHeader,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Structure: Story = {
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Breadcrumb>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Audience</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Members</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </PageHeader.Breadcrumb>
                <PageHeader.Title>
                    Members
                    <PageHeader.Count>12,345</PageHeader.Count>
                    <PageHeader.Description>All members across free, paid and complimentary tiers</PageHeader.Description>
                </PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup mobileMenuBreakpoint={800}>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search members..." type="search" />
                        <InputGroupAddon>
                            <Search className="size-4" />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button aria-label="More actions" size="icon" variant="outline">
                        <Ellipsis className="size-4" />
                    </Button>
                    <Button variant="outline">
                        <FilterIcon className="size-4" />
                        Filter
                    </Button>
                    <PageHeader.ActionGroup.MobileMenu>
                        <PageHeader.ActionGroup.MobileMenuTrigger>
                            <Button aria-label="More actions" size="icon" variant="outline">
                                <Ellipsis className="size-4" />
                            </Button>
                        </PageHeader.ActionGroup.MobileMenuTrigger>
                        <PageHeader.ActionGroup.MobileMenuContent>
                            <DropdownMenuItem>
                                <Search className="size-4" />
                                Search
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FilterIcon className="size-4" />
                                Filter
                            </DropdownMenuItem>
                        </PageHeader.ActionGroup.MobileMenuContent>
                    </PageHeader.ActionGroup.MobileMenu>
                    <PageHeader.ActionGroup.Primary>
                        <Button>
                            <Plus className="size-4" />
                            Add member
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const Basic: Story = {
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>Posts</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup mobileMenuBreakpoint={800}>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search posts..." type="search" />
                        <InputGroupAddon>
                            <Search className="size-4" />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button variant="outline">
                        <FilterIcon className="size-4" />
                        Filter
                    </Button>
                    <PageHeader.ActionGroup.MobileMenu>
                        <PageHeader.ActionGroup.MobileMenuTrigger>
                            <Button aria-label="More actions" size="icon" variant="outline">
                                <Ellipsis className="size-4" />
                            </Button>
                        </PageHeader.ActionGroup.MobileMenuTrigger>
                        <PageHeader.ActionGroup.MobileMenuContent>
                            <DropdownMenuItem>
                                <Search className="size-4" />
                                Search
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <FilterIcon className="size-4" />
                                Filter
                            </DropdownMenuItem>
                        </PageHeader.ActionGroup.MobileMenuContent>
                    </PageHeader.ActionGroup.MobileMenu>
                    <PageHeader.ActionGroup.Primary>
                        <Button>
                            <Plus className="size-4" />
                            New post
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const Subview: Story = {
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>Analytics</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="size-2 rounded-full bg-green-500" />
                    18 online
                </span>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const FilteredList: Story = {
    name: 'Filtered list',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>
                    Members
                    <PageHeader.Count>1,886</PageHeader.Count>
                </PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup mobileMenuBreakpoint={800}>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search members..." type="search" />
                        <InputGroupAddon>
                            <Search className="size-4" />
                        </InputGroupAddon>
                    </InputGroup>
                    <Button aria-label="More actions" size="icon" variant="outline">
                        <Ellipsis className="size-4" />
                    </Button>
                    <PageHeader.ActionGroup.MobileMenu>
                        <PageHeader.ActionGroup.MobileMenuTrigger>
                            <Button aria-label="More actions" size="icon" variant="outline">
                                <Ellipsis className="size-4" />
                            </Button>
                        </PageHeader.ActionGroup.MobileMenuTrigger>
                        <PageHeader.ActionGroup.MobileMenuContent>
                            <DropdownMenuItem>
                                <Search className="size-4" />
                                Search
                            </DropdownMenuItem>
                        </PageHeader.ActionGroup.MobileMenuContent>
                    </PageHeader.ActionGroup.MobileMenu>
                    <PageHeader.ActionGroup.Primary>
                        <Button>
                            <Plus className="size-4" />
                            New member
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const DetailPage: Story = {
    name: 'Detail page',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Breadcrumb>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/members">Members</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Jamie Larson</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </PageHeader.Breadcrumb>
                <PageHeader.Title>Jamie Larson</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup>
                    <Button aria-label="More actions" size="icon" variant="outline">
                        <Ellipsis className="size-4" />
                    </Button>
                    <PageHeader.ActionGroup.Primary>
                        <Button>Save</Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};
