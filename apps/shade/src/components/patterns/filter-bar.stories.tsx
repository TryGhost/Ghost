import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from '@/components/ui/button';
import {FilterBar} from '@/components/patterns/filter-bar';
import {Filters, createFilter, type Filter, type FilterFieldConfig} from '@/components/patterns/filters';
import {Circle, X} from 'lucide-react';

const meta = {
    title: 'Patterns / Filter Bar',
    component: FilterBar,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof FilterBar>;

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

export const WithFilters: Story = {
    name: 'With filters',
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([
            createFilter('memberStatus', 'is', ['complimentary'])
        ]);

        return (
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
        );
    }
};

export const Empty: Story = {
    render: () => {
        const [filters, setFilters] = useState<Filter[]>([]);

        return (
            <div className="space-y-2">
                <p className="px-4 text-sm text-muted-foreground">FilterBar auto-collapses when empty:</p>
                <FilterBar>
                    <Filters
                        addButtonText="Add filter"
                        fields={memberStatusFields}
                        filters={filters}
                        onChange={setFilters}
                    />
                </FilterBar>
            </div>
        );
    }
};
