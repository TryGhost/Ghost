import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '@/components/ui/button';
import {EmptyIndicator} from '@/components/ui/empty-indicator';
import {InputGroup, InputGroupAddon, InputGroupInput} from '@/components/ui/input-group';
import {ListPage} from './list-page';
import {PageHeader} from '@/components/patterns/page-header';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Filter, Plus, Search, Users} from 'lucide-react';
import {useState} from 'react';

const meta = {
    title: 'Patterns / List Page',
    component: ListPage,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
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

const WithDataComponent = () => {
    const [search, setSearch] = useState('');
    return (
        <ListPage>
            <PageHeader>
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
                            <Filter className='size-4' />
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
};

export const WithData: Story = {
    name: 'With data',
    render: () => <WithDataComponent />
};

const EmptyStateComponent = () => (
    <ListPage>
        <PageHeader>
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
        <ListPage.Body>
            <EmptyIndicator title='No members yet'>
                <Users />
            </EmptyIndicator>
        </ListPage.Body>
    </ListPage>
);

export const EmptyState: Story = {
    name: 'Empty state',
    render: () => <EmptyStateComponent />
};

const Minimal = () => (
    <ListPage>
        <PageHeader>
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
);

export const MinimalNoActions: Story = {
    name: 'Minimal',
    render: () => <Minimal />
};
