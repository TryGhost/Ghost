import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FilterBar } from '@/components/patterns/filter-bar';
import {
  Filters,
  createFilter,
  type Filter,
  type FilterFieldConfig,
} from '@/components/patterns/filters';
import { Circle, X } from 'lucide-react';

const meta = {
  title: 'Patterns / Filter Bar',
  component: FilterBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A full-width row for active filters with compact, consistent filter actions.',
      },
    },
  },
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
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'complimentary', label: 'Complimentary' },
    ],
  },
];

export const WithFilters: Story = {
  name: 'With filters',
  parameters: {
    docs: {
      description: {
        story: 'Use for active filters with compact actions such as saving the current view.',
      },
    },
  },
  render: () => {
    const [filters, setFilters] = useState<Filter[]>([
      createFilter('memberStatus', 'is', ['complimentary']),
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
        <FilterBar.Action variant="ghost">Save view</FilterBar.Action>
      </FilterBar>
    );
  },
};

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story: 'An empty Filters instance keeps its labelled add action until filters are active.',
      },
    },
  },
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
  },
};
