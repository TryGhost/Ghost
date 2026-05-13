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

export const Structure: Story = {
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);

        return (
            <PageHeader>
                {/* Left: Breadcrumb + Title (with Count and Description) */}
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

                {/* Actions: search, filter, primary action */}
                <PageHeader.Actions>
                    <PageHeader.ActionGroup>
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
                        <PageHeader.ActionGroup.Primary>
                            <Button>
                                <Plus className="size-4" />
                                Add member
                            </Button>
                        </PageHeader.ActionGroup.Primary>
                    </PageHeader.ActionGroup>
                </PageHeader.Actions>

                {/* ViewBar: tab navigation */}
                <PageHeader.ViewBar>
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
                </PageHeader.ViewBar>

                {/* ViewActions: date range or other view-level controls */}
                <PageHeader.ViewActions>
                    <Button variant="outline">
                        <CalendarDays className="size-4" />
                        Last 30 days
                    </Button>
                </PageHeader.ViewActions>

                {/* FilterBar: active filters + save view */}
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

export const Basic: Story = {
    render: () => (
        <PageHeader>
            <PageHeader.Left>
                <PageHeader.Title>Posts</PageHeader.Title>
            </PageHeader.Left>
            <PageHeader.Actions>
                <PageHeader.ActionGroup>
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
                <span className="text-sm text-muted-foreground">18 online</span>
            </PageHeader.Actions>
            <PageHeader.ViewBar>
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
            </PageHeader.ViewBar>
            <PageHeader.ViewActions>
                <Button variant="outline">
                    <CalendarDays className="size-4" />
                    Last 30 days
                </Button>
            </PageHeader.ViewActions>
        </PageHeader>
    )
};

export const FilteredList: Story = {
    name: 'Filtered list',
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);

        return (
            <PageHeader>
                <PageHeader.Left>
                    <PageHeader.Title>
                        Members
                        <PageHeader.Count>1,886</PageHeader.Count>
                    </PageHeader.Title>
                </PageHeader.Left>
                <PageHeader.Actions>
                    <PageHeader.ActionGroup>
                        <InputGroup className="w-full sm:w-56">
                            <InputGroupInput placeholder="Search members..." type="search" />
                            <InputGroupAddon>
                                <Search className="size-4" />
                            </InputGroupAddon>
                        </InputGroup>
                        <Button aria-label="More actions" size="icon" variant="outline">
                            <Ellipsis className="size-4" />
                        </Button>
                        <PageHeader.ActionGroup.Primary>
                            <Button>
                                <Plus className="size-4" />
                                New member
                            </Button>
                        </PageHeader.ActionGroup.Primary>
                    </PageHeader.ActionGroup>
                </PageHeader.Actions>
                <PageHeader.FilterBar>
                    <Filters
                        addButtonText="Add filter"
                        fields={memberStatusFields}
                        filters={filters}
                        onChange={setFilters}
                    />
                    <div className="flex items-center">
                        <Button variant="ghost" onClick={() => setFilters([])}>Clear</Button>
                        <Button variant="ghost">Save view</Button>
                    </div>
                </PageHeader.FilterBar>
            </PageHeader>
        );
    }
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
