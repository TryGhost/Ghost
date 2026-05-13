import {useState} from 'react';
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
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';
import {PageHeader} from './page-header';
import {PageMenu, PageMenuItem} from '@/components/ui/pagemenu';
import {Filters, createFilter, type Filter, type FilterFieldConfig} from './filters';
import {CalendarDays, Circle, Ellipsis, Filter as FilterIcon, Gauge, Mail, Plus, Search, Sprout, X} from 'lucide-react';

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

const memberStatusFields: FilterFieldConfig[] = [
    {
        key: 'memberStatus',
        label: 'Member status',
        type: 'select',
        icon: <Circle className="size-4" />,
        options: [
            {value: 'free', label: 'Free'},
            {value: 'paid', label: 'Paid'},
            {value: 'complimentary', label: 'Complimentary'}
        ]
    }
];

export const Plain: Story = {
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>Page title</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search..." type="search" />
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
                    <PageHeader.ActionGroup.Primary>
                        <Button>
                            <Plus className="size-4" />
                            New
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const TitleRowOnly: Story = {
    name: 'Breadcrumb + actions',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Breadcrumb>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Breadcrumbs</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>This page</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </PageHeader.Breadcrumb>
                <PageHeader.Title>Page title</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search..." type="search" />
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
                    <PageHeader.ActionGroup.Primary>
                        <Button>
                            <Plus className="size-4" />
                            New
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
        </PageHeader>
    )
};

export const TitleRowWithFilters: Story = {
    name: 'Breadcrumb + actions + filters',
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);

        return (
            <PageHeader>
                <PageHeader.Left>
                    <PageHeader.Breadcrumb>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Breadcrumbs</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>This page</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </PageHeader.Breadcrumb>
                    <PageHeader.Title>Page title</PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                        <InputGroup className="w-full sm:w-56">
                            <InputGroupInput placeholder="Search..." type="search" />
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
                        <PageHeader.ActionGroup.Primary>
                            <Button>
                                <Plus className="size-4" />
                                New
                            </Button>
                        </PageHeader.ActionGroup.Primary>
                    </PageHeader.ActionGroup>
                </PageHeader.Actions>
                <PageHeader.FilterBar>
                    <Filters
                        addButtonText="Add filter"
                        clearButtonIcon={<X className="size-4" />}
                        clearButtonText="Clear"
                        fields={memberStatusFields}
                        filters={filters}
                        showClearButton={true}
                        onChange={setFilters}
                    />
                    <Button size="sm" variant="ghost">Save view</Button>
                </PageHeader.FilterBar>
            </PageHeader>
        );
    }
};

export const TabsAndFilters: Story = {
    name: 'Tabs + view actions + filters (no title-row actions)',
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);

        return (
            <PageHeader>
                <PageHeader.Left>
                    <PageHeader.Title>Page title</PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.ViewTabs>
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
                </PageHeader.ViewTabs>
                <PageHeader.ViewActions>
                    <Button variant="outline">
                        <CalendarDays className="size-4" />
                        Last 30 days
                    </Button>
                </PageHeader.ViewActions>
                <PageHeader.FilterBar>
                    <Filters
                        addButtonText="Add filter"
                        clearButtonIcon={<X className="size-4" />}
                        clearButtonText="Clear"
                        fields={memberStatusFields}
                        filters={filters}
                        showClearButton={true}
                        onChange={setFilters}
                    />
                    <Button size="sm" variant="ghost">Save view</Button>
                </PageHeader.FilterBar>
            </PageHeader>
        );
    }
};

export const FullNoViewActions: Story = {
    name: 'Breadcrumb + actions + tabs + filters (no view actions)',
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);

        return (
            <PageHeader>
                <PageHeader.Left>
                    <PageHeader.Breadcrumb>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/">Breadcrumbs</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>This page</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </PageHeader.Breadcrumb>
                    <PageHeader.Title>Page title</PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                        <InputGroup className="w-full sm:w-56">
                            <InputGroupInput placeholder="Search..." type="search" />
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
                        <PageHeader.ActionGroup.Primary>
                            <Button>
                                <Plus className="size-4" />
                                New
                            </Button>
                        </PageHeader.ActionGroup.Primary>
                    </PageHeader.ActionGroup>
                </PageHeader.Actions>
                <PageHeader.ViewTabs>
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
                </PageHeader.ViewTabs>
                <PageHeader.FilterBar>
                    <Filters
                        addButtonText="Add filter"
                        clearButtonIcon={<X className="size-4" />}
                        clearButtonText="Clear"
                        fields={memberStatusFields}
                        filters={filters}
                        showClearButton={true}
                        onChange={setFilters}
                    />
                    <Button size="sm" variant="ghost">Save view</Button>
                </PageHeader.FilterBar>
            </PageHeader>
        );
    }
};

export const TitleRowWithTabs: Story = {
    name: 'Breadcrumb + actions + tabs',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Breadcrumb>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Breadcrumbs</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>This page</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </PageHeader.Breadcrumb>
                <PageHeader.Title>Page title</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup>
                    <InputGroup className="w-full sm:w-56">
                        <InputGroupInput placeholder="Search..." type="search" />
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
                    <PageHeader.ActionGroup.Primary>
                        <Button>
                            <Plus className="size-4" />
                            New
                        </Button>
                    </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
            <PageHeader.ViewTabs>
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
            </PageHeader.ViewTabs>
        </PageHeader>
    )
};

export const WithHeroImage: Story = {
    name: 'Title with hero image + description',
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Breadcrumb>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/posts">Posts</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Post analytics</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </PageHeader.Breadcrumb>
                <PageHeader.Title>
                    <PageHeader.HeroImage src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=400" />
                    The future of independent publishing
                    <PageHeader.Description>Published and sent on November 18, 2025 at 9:00 AM</PageHeader.Description>
                </PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup>
                    <Button variant="outline">
                        <Ellipsis className="size-4" />
                    </Button>
                </PageHeader.ActionGroup>
            </PageHeader.Actions>
            <PageHeader.ViewTabs>
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
            </PageHeader.ViewTabs>
        </PageHeader>
    )
};
