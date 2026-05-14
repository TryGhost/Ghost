import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '@/components/ui/button';
import {EmptyIndicator} from '@/components/ui/empty-indicator';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';
import {PageMenu, PageMenuItem} from '@/components/ui/pagemenu';
import {ListPage} from '@/components/page-templates/list-page';
import {PageHeader} from '@/components/patterns/page-header';
import {ViewBar} from '@/components/patterns/view-bar';
import {FilterBar} from '@/components/patterns/filter-bar';
import {Filters, createFilter, type Filter, type FilterFieldConfig} from '@/components/patterns/filters';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {CalendarDays, Circle, Filter as FilterIcon, Gauge, Mail, Plus, Search, Sprout, Users, X} from 'lucide-react';

const meta = {
    title: 'Page Templates / List Page',
    component: ListPage,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
ListPage is the canonical recipe for the **List page** type — the recurring structure used by Members, Tags, Comments, Automations, etc.

It is intentionally thin: a vertical flex-col stack with horizontal padding. Drop the named slots in as direct children.

- \`<ListPage.Header>\` — sticky, blurred, full-bleed chrome band. Place \`PageHeader\`, \`ViewBar\`, and/or \`FilterBar\` directly inside as siblings. \`FilterBar\` auto-collapses when it has no active filters.
- \`<ListPage.Body>\` — main content area (table, list, or empty state)
- \`<ListPage.Pagination>\` — optional centered pagination row (load-more, page links)

\`\`\`tsx
<ListPage>
  <ListPage.Header>
    <PageHeader sticky={false} blurredBackground={false}>…</PageHeader>
    <ViewBar>…</ViewBar>          {/* optional */}
    <FilterBar>…</FilterBar>      {/* optional — auto-collapses when empty */}
  </ListPage.Header>
  <ListPage.Body>…</ListPage.Body>
  <ListPage.Pagination>…</ListPage.Pagination>
</ListPage>
\`\`\`
                `
            }
        }
    }
} satisfies Meta<typeof ListPage>;

export default meta;
type Story = StoryObj<typeof ListPage>;

const SAMPLE_MEMBERS = [
    {id: 1, name: 'Ada Lovelace', email: 'ada@example.com', tier: 'Gold'},
    {id: 2, name: 'Grace Hopper', email: 'grace@example.com', tier: 'Silver'},
    {id: 3, name: 'Linus Torvalds', email: 'linus@example.com', tier: 'Free'},
    {id: 4, name: 'Margaret Hamilton', email: 'margaret@example.com', tier: 'Gold'}
];

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

export const WithData: Story = {
    name: 'With data',
    render: () => {
        const [search, setSearch] = useState('');
        return (
            <ListPage>
                <ListPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <PageHeader.Title>
                                Members
                                <PageHeader.Count>{SAMPLE_MEMBERS.length}</PageHeader.Count>
                            </PageHeader.Title>
                        </PageHeader.Left>
                        <PageHeader.Actions>
                            <PageHeader.ActionGroup>
                                <InputGroup className='h-[34px] w-[240px]'>
                                    <InputGroupAddon>
                                        <Search className='size-4' strokeWidth={1.75} />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        className='!h-[34px]'
                                        placeholder='Search members...'
                                        type='search'
                                        value={search}
                                        onChange={event => setSearch(event.target.value)}
                                    />
                                </InputGroup>
                                <Button variant='outline'>
                                    <FilterIcon className='size-4' />
                                    Filter
                                </Button>
                                <Button variant='outline'>Import</Button>
                                <Button>
                                    <Plus className='size-4' />
                                    Add member
                                </Button>
                            </PageHeader.ActionGroup>
                        </PageHeader.Actions>
                    </PageHeader>
                </ListPage.Header>
                <ListPage.Body>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Tier</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {SAMPLE_MEMBERS.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{member.tier}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ListPage.Body>
                <ListPage.Pagination>
                    <Button variant='outline'>Load more</Button>
                </ListPage.Pagination>
            </ListPage>
        );
    }
};

export const EmptyState: Story = {
    name: 'Empty state',
    render: () => (
        <ListPage>
            <ListPage.Header>
                <PageHeader blurredBackground={false} sticky={false}>
                    <PageHeader.Left>
                        <PageHeader.Title>Members</PageHeader.Title>
                    </PageHeader.Left>
                    <PageHeader.Actions>
                        <PageHeader.ActionGroup>
                            <Button>
                                <Plus className='size-4' />
                                Add member
                            </Button>
                        </PageHeader.ActionGroup>
                    </PageHeader.Actions>
                </PageHeader>
            </ListPage.Header>
            <ListPage.Body>
                <EmptyIndicator title='No members yet'>
                    <Users />
                </EmptyIndicator>
            </ListPage.Body>
        </ListPage>
    )
};

export const MinimalNoActions: Story = {
    name: 'Minimal',
    render: () => (
        <ListPage>
            <ListPage.Header>
                <PageHeader blurredBackground={false} sticky={false}>
                    <PageHeader.Left>
                        <PageHeader.Title>Tags</PageHeader.Title>
                    </PageHeader.Left>
                    <PageHeader.Actions>
                        <PageHeader.ActionGroup>
                            <Button>
                                <Plus className='size-4' />
                                New tag
                            </Button>
                        </PageHeader.ActionGroup>
                    </PageHeader.Actions>
                </PageHeader>
            </ListPage.Header>
            <ListPage.Body>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Slug</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>News</TableCell>
                            <TableCell>news</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </ListPage.Body>
        </ListPage>
    )
};

export const WithViewBar: Story = {
    name: 'With view bar',
    render: () => (
        <ListPage>
            <ListPage.Header>
                <PageHeader blurredBackground={false} sticky={false}>
                    <PageHeader.Left>
                        <PageHeader.Title>
                            Members
                            <PageHeader.Count>{SAMPLE_MEMBERS.length}</PageHeader.Count>
                        </PageHeader.Title>
                    </PageHeader.Left>
                    <PageHeader.Actions>
                        <PageHeader.ActionGroup>
                            <InputGroup className='h-[34px] w-[240px]'>
                                <InputGroupAddon>
                                    <Search className='size-4' strokeWidth={1.75} />
                                </InputGroupAddon>
                                <InputGroupInput
                                    className='!h-[34px]'
                                    placeholder='Search members...'
                                    type='search'
                                />
                            </InputGroup>
                            <Button variant='outline'>
                                <FilterIcon className='size-4' />
                                Filter
                            </Button>
                            <Button>
                                <Plus className='size-4' />
                                Add member
                            </Button>
                        </PageHeader.ActionGroup>
                    </PageHeader.Actions>
                </PageHeader>
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
            </ListPage.Header>
            <ListPage.Body>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Tier</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {SAMPLE_MEMBERS.map(member => (
                            <TableRow key={member.id}>
                                <TableCell>{member.name}</TableCell>
                                <TableCell>{member.email}</TableCell>
                                <TableCell>{member.tier}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ListPage.Body>
            <ListPage.Pagination>
                <Button variant='outline'>Load more</Button>
            </ListPage.Pagination>
        </ListPage>
    )
};

export const WithFilterBar: Story = {
    name: 'With filter bar',
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);
        return (
            <ListPage>
                <ListPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <PageHeader.Title>
                                Members
                                <PageHeader.Count>{SAMPLE_MEMBERS.length}</PageHeader.Count>
                            </PageHeader.Title>
                        </PageHeader.Left>
                        <PageHeader.Actions>
                            <PageHeader.ActionGroup>
                                <InputGroup className='h-[34px] w-[240px]'>
                                    <InputGroupAddon>
                                        <Search className='size-4' strokeWidth={1.75} />
                                    </InputGroupAddon>
                                    <InputGroupInput
                                        className='!h-[34px]'
                                        placeholder='Search members...'
                                        type='search'
                                    />
                                </InputGroup>
                                <Button variant='outline'>
                                    <FilterIcon className='size-4' />
                                    Filter
                                </Button>
                                <Button>
                                    <Plus className='size-4' />
                                    Add member
                                </Button>
                            </PageHeader.ActionGroup>
                        </PageHeader.Actions>
                    </PageHeader>
                    <FilterBar>
                        <Filters
                            addButtonText="Add filter"
                            clearButtonIcon={<X className="size-4" />}
                            clearButtonText="Clear"
                            fields={memberStatusFields}
                            filters={filters}
                            showClearButton={true}
                            onChange={setFilters}
                        />
                        <Button variant="ghost">Save view</Button>
                    </FilterBar>
                </ListPage.Header>
                <ListPage.Body>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Tier</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {SAMPLE_MEMBERS.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>{member.name}</TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>{member.tier}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ListPage.Body>
                <ListPage.Pagination>
                    <Button variant='outline'>Load more</Button>
                </ListPage.Pagination>
            </ListPage>
        );
    }
};
